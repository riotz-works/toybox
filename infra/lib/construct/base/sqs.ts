import { Queue, type IQueue, type QueueProps, } from 'aws-cdk-lib/aws-sqs';
import { Construct, } from 'constructs';
import { idToName, type Config, } from '../../config.js';
import { AppBaseInfraStack, } from '../../stack/app-base-infra.js';


type BaseQueueProps = QueueProps & Config;


class BaseQueue extends Construct {

  private readonly queue: Queue;

  public get queueRef(): IQueue { return this.queue; }

  public constructor(scope: Construct, id: string, props: BaseQueueProps, standard = true,) {
    super(scope, id,);

    const { queueName: _queueName, ...config } = props;
    this.queue = new Queue(this, 'Queue', {
      queueName: _queueName ? `${_queueName}${props.suffix}` : idToName(id, props,),
      enforceSSL: true,
      ...standard ? { deadLetterQueue: { queue: AppBaseInfraStack.importDeadLetterQueue(this, props,), maxReceiveCount: 3, }, } : {},
      ...config, // 'props' last to allow overrides of defaults defined above
    },);
  }
}


export type { BaseQueueProps, };
export { BaseQueue, };
