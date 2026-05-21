import type { IBucket, } from 'aws-cdk-lib/aws-s3';
import type { ITopic, } from 'aws-cdk-lib/aws-sns';
import type { IQueue, } from 'aws-cdk-lib/aws-sqs';
import type { Construct, } from 'constructs';
import { idToName, type Config, } from '../config.js';
import { BaseStack, type BaseStackProps, } from '../construct/base/stack.js';
import { LoggingBucket, } from '../construct/s3/logging.js';
import { MalwareNotificationTopic, } from '../construct/sns/malware-notification.js';
import { DeadLetterQueue, } from '../construct/sqs/dlq.js';


type AppBaseInfraStackProps = BaseStackProps;


const STACK_ID = 'AppBaseInfra' as const;
class AppBaseInfraStack extends BaseStack {

  public constructor(scope: Construct, props: AppBaseInfraStackProps,) {
    super(scope, STACK_ID, props,);
    new LoggingBucket(this, 'Logging', props,);
    new DeadLetterQueue(this, 'DeadLetterQueue', props,);
    new MalwareNotificationTopic(this, 'MalwareNotificationTopic', props,);
  }

  private static getStackName(props: Config,): string { return idToName(STACK_ID, props,); }
  public static importLoggingBucket(scope: Construct, props: Config,): IBucket { return LoggingBucket.import(scope, 'LoggingBucket', AppBaseInfraStack.getStackName(props,),); }
  public static importDeadLetterQueue(scope: Construct, props: Config,): IQueue { return DeadLetterQueue.import(scope, 'DeadLetterQueue', AppBaseInfraStack.getStackName(props,),); }
  public static importMalwareNotificationTopic(scope: Construct, props: Config,): ITopic { return MalwareNotificationTopic.import(scope, 'MalwareNotificationTopic', AppBaseInfraStack.getStackName(props,),); }
}


export { AppBaseInfraStack, };
