import { Effect, PolicyStatement, ServicePrincipal, } from 'aws-cdk-lib/aws-iam';
import { CfnDeliveryStream, } from 'aws-cdk-lib/aws-kinesisfirehose';
import { CfnSubscriptionFilter, LogGroup, LogStream, type ILogGroupRef, type LogGroupProps, } from 'aws-cdk-lib/aws-logs';
import { NagSuppressions, } from 'cdk-nag';
import { Construct, } from 'constructs';
import { idToName, type Config, } from '../../config.js';
import { LoggingBucket, } from '../s3/logging.js';
import { BaseRole, } from './role.js';


type BaseLogGroupProps = LogGroupProps & Config & {
  readonly principal: string;
  readonly logGroupName: string;
};


class BaseLogGroup extends Construct {

  private readonly logGroup: LogGroup;

  public get logGroupArn(): string { return this.logGroup.logGroupArn; }
  public get logGroupRef(): ILogGroupRef { return this.logGroup; }

  public constructor(scope: Construct, id: string, props: BaseLogGroupProps,) {
    super(scope, id,);

    const loggingBucket = LoggingBucket.import(this, 'LoggingBucket', props,);

    const prefix = `cloud-watch-logs/account_id=${props.env.account}/region=${props.env.region}/env=${props.env.stage}/`;
    const firehoseName = idToName('CwlArchive', props,);

    const firehoseRole = new BaseRole(this, 'FirehoseRole', {
      assumedBy: new ServicePrincipal('firehose.amazonaws.com',),
      ...props,
    },);
    firehoseRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        's3:GetBucketLocation',
        's3:ListBucket',
        's3:ListBucketMultipartUploads',
      ],
      resources: [ loggingBucket.bucketArn, ],
    },),);
    firehoseRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        's3:PutObject',
        's3:AbortMultipartUpload',
        's3:GetObject',
      ],
      resources: [ loggingBucket.arnForObjects(`${prefix}*`,), ],
    },),);

    const firehoseLogGroup = new LogGroup(this, 'FirehoseLogGroup', {
      logGroupName: `/aws/kinesisfirehose/${firehoseName}`,
    },);
    const firehoseLogStream = new LogStream(this, 'FirehoseLogStream', {
      logGroup: firehoseLogGroup,
      logStreamName: 'firehose-errors',
    },);
    firehoseRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [ 'logs:CreateLogStream', ],
      resources: [ firehoseLogGroup.logGroupArn, ],
    },),);
    firehoseRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [ 'logs:PutLogEvents', ],
      resources: [ `${firehoseLogGroup.logGroupArn}:log-stream:*`, ],
    },),);

    const deliveryStream = new CfnDeliveryStream(this, 'DeliveryStream', {
      deliveryStreamName: firehoseName,
      deliveryStreamType: 'DirectPut',
      deliveryStreamEncryptionConfigurationInput: {
        keyType: 'AWS_OWNED_CMK',
      },
      extendedS3DestinationConfiguration: {
        bucketArn: loggingBucket.bucketArn,
        roleArn: firehoseRole.roleArn,
        prefix: `${prefix}year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/`,
        errorOutputPrefix: `${prefix}errors/!{firehose:error-output-type}/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/`,
        compressionFormat: 'UNCOMPRESSED',
        cloudWatchLoggingOptions: {
          enabled: true,
          logGroupName: firehoseLogGroup.logGroupName,
          logStreamName: 'firehose-errors',
        },
        processingConfiguration: {
          enabled: true,
          processors: [{
            type: 'Decompression',
            parameters: [{
              parameterName: 'CompressionFormat',
              parameterValue: 'GZIP',
            },],
          },],
        },
      },
    },);
    deliveryStream.node.addDependency(firehoseRole,);
    deliveryStream.node.addDependency(firehoseLogStream,);

    const cwlToFirehoseRole = new BaseRole(this, 'CwlToFirehoseRole', {
      assumedBy: new ServicePrincipal('logs.amazonaws.com',),
      ...props,
    },);
    cwlToFirehoseRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [ 'firehose:PutRecord', 'firehose:PutRecordBatch', ],
      resources: [ deliveryStream.attrArn, ],
    },),);
    NagSuppressions.addResourceSuppressions(cwlToFirehoseRole, [
      { id: 'AwsSolutions-IAM5', reason: 'CloudWatch Logs subscription requires firehose:PutRecord on the dedicated delivery stream ARN only.', },
    ], true,);
    NagSuppressions.addResourceSuppressions(firehoseRole, [
      { id: 'AwsSolutions-IAM5', reason: 'Firehose requires object ARN wildcard for prefix-scoped object writes only.', appliesTo: [{ regex: '/Resource::.*cloud-watch-logs.*/', },], },
      { id: 'AwsSolutions-IAM5', reason: 'Firehose error logging writes to log-stream:* under its dedicated log group.', appliesTo: [{ regex: '/Resource::.*:log-stream:\\*/', },], },
    ], true,);


    this.logGroup = new LogGroup(this, 'LogGroup', props,);

    const logRole = new BaseRole(this, 'LogRole', {
      assumedBy: new ServicePrincipal(props.principal,),
      ...props, // 'props' last to allow overrides of defaults defined above
    },);
    logRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: [
        this.logGroup.logGroupArn,
        `${this.logGroup.logGroupArn}:log-stream:*`,
      ],
    },),);
    NagSuppressions.addResourceSuppressions(logRole, [
      { id: 'AwsSolutions-IAM5', reason: 'Log streams are dynamically created, requiring wildcard access for log-stream resources.', },
    ], true,);

    const subscriptionFilter = new CfnSubscriptionFilter(this, 'ArchiveSubscription', {
      logGroupName: this.logGroup.logGroupName,
      destinationArn: deliveryStream.attrArn,
      roleArn: cwlToFirehoseRole.roleArn,
      filterPattern: '',
    },);
    subscriptionFilter.node.addDependency(cwlToFirehoseRole,);
  }
}


export { BaseLogGroup, };
