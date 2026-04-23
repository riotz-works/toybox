import { Queue, type IQueue, } from 'aws-cdk-lib/aws-sqs';
import { NagSuppressions, } from 'cdk-nag';
import { Construct, } from 'constructs';
import { name, } from '../../config.js';
import { BaseQueue, OutputCrossStack, type BaseQueueProps, type OutputProps, } from '../base/index.js';


type DeadLetterQueueProps = Omit<BaseQueueProps, 'queueName'>;


class DeadLetterQueue extends Construct {

  public constructor(scope: Construct, id: string, props: DeadLetterQueueProps,) {
    super(scope, id,);

    const queue = new BaseQueue(this, 'BaseQueue', {
      queueName: `${name}-dead-letter-queue`,
      ...props, // 'props' last to allow overrides of defaults defined above
    }, false,);
    NagSuppressions.addResourceSuppressions(queue, [
      { id: 'AwsSolutions-SQS3', reason: 'Dead letter queue cannot have its own dead letter queue', },
      { id: 'Serverless-SQSRedrivePolicy', reason: 'Dead letter queue cannot have its own dead letter queue', },
    ], true,);

    new OutputCrossStack(this, 'DeadLetterQueueArn', queue.queueArn, 'dead-letter-queue-arn', props,);
  }


  public static import(scope: Construct, id: string, props: OutputProps,): IQueue {
    const queueArn = OutputCrossStack.import('dead-letter-queue-arn', props,);
    return Queue.fromQueueArn(scope, id, queueArn,);
  }
}


export { DeadLetterQueue, };
