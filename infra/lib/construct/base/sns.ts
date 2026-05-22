/* eslint-disable @typescript-eslint/naming-convention -- 'cuz naming for aws resources */
import { PolicyDocument, PolicyStatement, ServicePrincipal, } from 'aws-cdk-lib/aws-iam';
import { Topic, type ITopic, type LoggingProtocol, type TopicProps, } from 'aws-cdk-lib/aws-sns';
import { Construct, } from 'constructs';
import { idToName, type Config, } from '../../config.js';
import { BaseRole, } from './role.js';


type BaseTopicProps = TopicProps & Config;


class BaseTopic extends Construct {

  private readonly topic: Topic;

  public get topicRef(): ITopic { return this.topic; }

  public constructor(scope: Construct, id: string, props: BaseTopicProps,) {
    super(scope, id,);

    const { topicName: _topicName, ...config } = props;
    this.topic = new Topic(this, 'Topic', {
      topicName: _topicName ? `${_topicName}${props.suffix}` : idToName(id, props,),
      enforceSSL: true,
      ...config, // 'props' last to allow overrides of defaults defined above
    },);
  }

  public addFailureFeedbackLoggingConfig(protocol: LoggingProtocol, props: Config,): void {
    this.topic.addLoggingConfig({
      protocol,
      failureFeedbackRole: new BaseRole(this, 'FailureFeedbackRole', {
        assumedBy: new ServicePrincipal('sns.amazonaws.com',),
        inlinePolicies: {
          'sns-failure-feedback': new PolicyDocument({
            statements: [
              new PolicyStatement({
                actions: [
                  'logs:CreateLogGroup',
                  'logs:CreateLogStream',
                  'logs:PutLogEvents',
                  'logs:PutMetricFilter',
                  'logs:PutRetentionPolicy',
                ],
                resources: [ '*', ],
              },),
            ],
          },),
        },
        ...props,
      },).roleRef,
    },);
  }
}


export type { BaseTopicProps, };
export { BaseTopic, };
