import { Duration, } from 'aws-cdk-lib';
import { Bucket, BucketAccessControl, ObjectOwnership, StorageClass, type IBucket, } from 'aws-cdk-lib/aws-s3';
import { NagSuppressions, } from 'cdk-nag';
import { Construct, } from 'constructs';
import { name, } from '../../config.js';
import { BaseBucket, OutputCrossStack, type BaseBucketProps, type ImportOptions, } from '../base/index.js';


type LoggingBucketProps = Omit<BaseBucketProps, 'deadLetterQueue' | 'malwareNotificationTopic' | 'bucketName'>;


class LoggingBucket extends Construct {

  private readonly bucket: BaseBucket;

  public constructor(scope: Construct, id: string, props: LoggingBucketProps,) {
    super(scope, id,);

    this.bucket = new BaseBucket(this, 'BaseBucket', {
      bucketName: `${name}-logging`,
      versioned: false,
      accessControl: BucketAccessControl.LOG_DELIVERY_WRITE,
      objectOwnership: ObjectOwnership.OBJECT_WRITER,
      lifecycleRules: [{
        transitions: [
          { storageClass: StorageClass.GLACIER, transitionAfter: Duration.days(90,), },
          { storageClass: StorageClass.DEEP_ARCHIVE, transitionAfter: Duration.days(365,), },
        ],
      },],
      logging: false,
      malwareProtection: false,
      ...props, // 'props' last to allow overrides of defaults defined above
    },);
    NagSuppressions.addResourceSuppressions(this.bucket, [
      { id: 'AwsSolutions-S1', reason: 'Logging bucket should not have server access logs to prevent circular logging', },
    ], true,);

    new OutputCrossStack(this, 'LoggingBucketName', { value: this.bucket.bucketRef.bucketName, },);
  }


  public static import(scope: Construct, id: string, stackName: string, options?: ImportOptions,): IBucket {
    const bucketName = OutputCrossStack.import(stackName, 'LoggingBucketName', options,);
    return Bucket.fromBucketName(scope, id, bucketName,);
  }
}


export { LoggingBucket, };
