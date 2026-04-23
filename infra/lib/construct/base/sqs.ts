import { Queue, type QueueProps, } from 'aws-cdk-lib/aws-sqs';
import { Construct, } from 'constructs';
import { idToName, type Config, } from '../../config.js';
import { DeadLetterQueue, } from '../sqs/dlq.js';


type BaseQueueProps = QueueProps & Config;


class BaseQueue extends Construct {

  private readonly queue: Queue;

  public get queueArn(): string { return this.queue.queueArn; }

  public constructor(scope: Construct, id: string, props: BaseQueueProps, standard = true,) {
    super(scope, id,);

    const { queueName: _queueName, ...config } = props;
    this.queue = new Queue(this, 'Queue', {
      queueName: _queueName ? `${_queueName}${props.suffix}` : idToName(id, props,),
      enforceSSL: true,
      ...standard ? { deadLetterQueue: { queue: DeadLetterQueue.import(this, 'DeadLetterQueue', props,), maxReceiveCount: 3, }, } : {},
      ...config, // 'props' last to allow overrides of defaults defined above
    },);
  }
}


export type { BaseQueueProps, };
export { BaseQueue, };
