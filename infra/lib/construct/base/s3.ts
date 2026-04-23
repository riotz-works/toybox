/* eslint-disable @typescript-eslint/naming-convention -- 'cuz naming by aws-cdk */
import { Stack, } from 'aws-cdk-lib';
import { CfnRule, } from 'aws-cdk-lib/aws-events';
import { CfnMalwareProtectionPlan, } from 'aws-cdk-lib/aws-guardduty';
import { PolicyStatement, ServicePrincipal, } from 'aws-cdk-lib/aws-iam';
import { BlockPublicAccess, Bucket, BucketAccessControl, ObjectOwnership, type BucketProps, } from 'aws-cdk-lib/aws-s3';
import { NagSuppressions, } from 'cdk-nag';
import { Construct, } from 'constructs';
import { idToName, type Config, } from '../../config.js';
import { rsuffix, } from '../../util.js';
import { MalwareNotificationTopic, } from '../sns/malware-notification.js';
import { DeadLetterQueue, } from '../sqs/dlq.js';
import { BaseRole, } from './role.js';


type BaseBucketProps = BucketProps & Config & {
  readonly bucketName: string;
};


class BaseBucket extends Construct {

  private readonly bucket: Bucket;

  /** Underlying bucket construct (parent scope may differ from this construct for stable logical IDs). */
  public get s3(): Bucket { return this.bucket; }

  public get bucketName(): string { return this.bucket.bucketName; }

  public constructor(scope: Construct, id: string, props: BaseBucketProps, protection = true,) {
    super(scope, id,);

    const { bucketName: _bucketName, ...config } = props;
    const bucketName = _bucketName ? `${_bucketName}${props.suffix}${rsuffix(props,)}` : idToName(id, props,);
    this.bucket = new Bucket(this, 'Bucket', {
      bucketName,

      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,

      versioned: true,
      enforceSSL: true,
      transferAcceleration: true,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,

      ...props.accessControl === BucketAccessControl.LOG_DELIVERY_WRITE ? {} : {
        serverAccessLogsBucket: props.serverAccessLogsBucket,
        serverAccessLogsPrefix: `s3/${bucketName}/`,
      },

      ...config, // 'props' last to allow overrides of defaults defined above
    },);

    if (protection) {
      addMalwareProtection(this.bucket, props,);
    }
  }
}


const addMalwareProtection = (bucket: Bucket, props: BaseBucketProps,): void => {
  const { bucketArn, bucketName, } = bucket;

  const eventBridgeRuleArn = Stack.of(bucket,).formatArn({ service: 'events', resource: 'rule', resourceName: 'DO-NOT-DELETE-AmazonGuardDutyMalwareProtectionS3*', },);
  const roleMalwareProtection = new BaseRole(bucket, 'MalwareProtectionRole', { assumedBy: new ServicePrincipal('malware-protection-plan.guardduty.amazonaws.com',), ...props, },);
  roleMalwareProtection.addToPolicy(new PolicyStatement({ sid: 'AllowManagedRuleToSendS3EventsToGuardDuty', actions: [ 'events:DeleteRule', 'events:PutRule', 'events:PutTargets', 'events:RemoveTargets', ], resources: [ eventBridgeRuleArn, ], conditions: { StringLike: { 'events:ManagedBy': 'malware-protection-plan.guardduty.amazonaws.com', }, }, },),);
  roleMalwareProtection.addToPolicy(new PolicyStatement({ sid: 'AllowGuardDutyToMonitorEventBridgeManagedRule', actions: [ 'events:DescribeRule', 'events:ListTargetsByRule', ], resources: [ eventBridgeRuleArn, ], },),);
  roleMalwareProtection.addToPolicy(new PolicyStatement({ sid: 'AllowPostScanTag', actions: [ 's3:GetObjectTagging', 's3:GetObjectVersionTagging', 's3:PutObjectTagging', 's3:PutObjectVersionTagging', ], resources: [ bucket.arnForObjects('*',), ], },),);
  roleMalwareProtection.addToPolicy(new PolicyStatement({ sid: 'AllowEnableS3EventBridgeEvents', actions: [ 's3:GetBucketNotification', 's3:PutBucketNotification', ], resources: [ bucketArn, ], },),);
  roleMalwareProtection.addToPolicy(new PolicyStatement({ sid: 'AllowPutValidationObject', actions: [ 's3:PutObject', ], resources: [ bucket.arnForObjects('malware-protection-resource-validation-object',), ], },),);
  roleMalwareProtection.addToPolicy(new PolicyStatement({ sid: 'AllowCheckBucketOwnership', actions: [ 's3:ListBucket', ], resources: [ bucketArn, ], },),);
  roleMalwareProtection.addToPolicy(new PolicyStatement({ sid: 'AllowBucketOwnerPermissions', actions: [ 's3:GetBucketLocation', 's3:GetObject', 's3:PutObject', ], resources: [ bucketArn, bucket.arnForObjects('*',), ], },),);
  roleMalwareProtection.addToPolicy(new PolicyStatement({ sid: 'AllowMalwareScan', actions: [ 's3:GetObject', 's3:GetObjectVersion', ], resources: [ bucket.arnForObjects('*',), ], },),);

  const malwareProtectionPlan = new CfnMalwareProtectionPlan(bucket, 'MalwareProtectionPlan', {
    protectedResource: { s3Bucket: { bucketName, }, },
    role: roleMalwareProtection.roleArn,
    actions: { tagging: { status: 'ENABLED', }, },
  },);
  const defaultPolicy = roleMalwareProtection.node.tryFindChild('DefaultPolicy',);
  if (defaultPolicy) {
    malwareProtectionPlan.node.addDependency(defaultPolicy,);
    NagSuppressions.addResourceSuppressions(defaultPolicy, [
      { id: 'AwsSolutions-IAM5', reason: 'GuardDuty Malware Protection managed service requires wildcards per AWS design; cannot be narrowed.', appliesTo: [{ regex: '/^Resource::arn:.*:events:.*:rule\\/DO-NOT-DELETE-AmazonGuardDutyMalwareProtectionS3\\*$/', }, { regex: '/^Resource::<.*\\.Arn>\\/\\*$/', }, { regex: '/^Resource::arn:.*:kms:.*:key\\/\\*$/', },], },
    ],);
  }

  const malwareNotificationTopicArn = MalwareNotificationTopic.import(bucket, 'MalwareNotificationTopic', props,).topicArn;
  const eventBridgeToSnsRole = new BaseRole(bucket, 'EventBridgeToSnsRole', { assumedBy: new ServicePrincipal('events.amazonaws.com',), ...props, },);
  eventBridgeToSnsRole.addToPolicy(new PolicyStatement({
    actions: [ 'sns:Publish', ],
    resources: [ malwareNotificationTopicArn, ],
  },),);

  new CfnRule(bucket, 'MalwareFoundNotificationRule', {
    eventPattern: {
      'source': [ 'aws.guardduty', ],
      'detail-type': [ 'GuardDuty Malware Protection Object Scan Result', ],
      'detail': {
        scanResultDetails: { scanResultStatus: [ 'THREATS_FOUND', ], },
        s3ObjectDetails: { bucketName: [ bucketName, ], },
      },
    },
    state: 'ENABLED',
    targets: [
      {
        id: 'MalwareNotificationTopic',
        arn: malwareNotificationTopicArn,
        roleArn: eventBridgeToSnsRole.roleArn,
        deadLetterConfig: {
          arn: DeadLetterQueue.import(bucket, 'DeadLetterQueue', props,).queueArn,
        },
      },
    ],
  },);
};


export type { BaseBucketProps, };
export { BaseBucket, };
