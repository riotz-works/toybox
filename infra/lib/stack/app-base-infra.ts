import type { Construct, } from 'constructs';
import { BaseStack, type BaseStackProps, } from '../construct/base/index.js';
import { LoggingBucket, } from '../construct/s3/logging.js';
import { MalwareNotificationTopic, } from '../construct/sns/malware-notification.js';
import { DeadLetterQueue, } from '../construct/sqs/dlq.js';


type AppBaseInfraStackProps = BaseStackProps;


class AppBaseInfraStack extends BaseStack {

  public constructor(scope: Construct, id: string, props: AppBaseInfraStackProps,) {
    super(scope, id, props,);
    new LoggingBucket(this, 'Logging', props,);
    new DeadLetterQueue(this, 'DeadLetterQueue', props,);
    new MalwareNotificationTopic(this, 'MalwareNotificationTopic', props,);
  }
}


export { AppBaseInfraStack, };
