import { Duration, } from 'aws-cdk-lib';
import { Effect, PolicyStatement, ServicePrincipal, } from 'aws-cdk-lib/aws-iam';
import { Architecture, DockerImageFunction, Tracing, type DockerImageFunctionProps, type FunctionUrl, type FunctionUrlOptions, } from 'aws-cdk-lib/aws-lambda';
import type { IQueue, } from 'aws-cdk-lib/aws-sqs';
import { NagSuppressions, } from 'cdk-nag';
import { Construct, } from 'constructs';
import { idToName, type Config, } from '../../config.js';
import { DeadLetterQueue, } from '../sqs/dlq.js';
import { BaseLogGroup, } from './log-group.js';
import { BaseRole, } from './role.js';


type BaseDockerImageFunctionProps = DockerImageFunctionProps & Config;


export class BaseDockerImageFunction extends Construct {

  private readonly function: DockerImageFunction;

  public get functionArn(): string { return this.function.functionArn; }

  public constructor(scope: Construct, id: string, props: BaseDockerImageFunctionProps,) {
    super(scope, id,);

    const deadLetterQueue = DeadLetterQueue.import(this, 'DeadLetterQueue', props,);

    const logGroup = createLogGroup(this, 'LogGroup', props,);
    const executionRole = createExecutionRole(this, 'ExecutionRole', { nameId: id, logGroup, dlq: deadLetterQueue, props, },);
    this.function = new DockerImageFunction(this, 'Function', {
      functionName: idToName(id, props,),
      architecture: Architecture.X86_64,
      timeout: Duration.seconds(3 * 60,),
      role: executionRole.roleRef,
      logGroup: logGroup.logGroupRef,
      tracing: Tracing.ACTIVE,
      deadLetterQueueEnabled: true,
      deadLetterQueue,
      environment: { LOG_LEVEL: props.logLevel, ...props.environment, }, // eslint-disable-line @typescript-eslint/naming-convention -- 'cuz environment variable
      ...props, // 'props' last to allow overrides of defaults defined above
      memorySize: Math.max(props.memorySize, 4 * 1024,),
    },);
  }

  public addFunctionUrl(props: FunctionUrlOptions,): FunctionUrl {
    return this.function.addFunctionUrl(props,);
  }
}


const createLogGroup = (scope: Construct, id: string, props: Config,): BaseLogGroup => new BaseLogGroup(scope, 'LogGroup', {
  logGroupName: `/aws/lambda/${idToName(id, props,)}`,
  principal: 'lambda.amazonaws.com',
  ...props,
},);

type ExecutionRoleOptions = { readonly nameId: string; readonly logGroup: BaseLogGroup; readonly dlq: IQueue; readonly props: Config };

const createExecutionRole = (scope: Construct, id: string, { nameId, logGroup, dlq, props, }: ExecutionRoleOptions,): BaseRole => {
  const role = new BaseRole(scope, id, {
    roleName: idToName(nameId, props,),
    assumedBy: new ServicePrincipal('lambda.amazonaws.com',),
    ...props,
  },);
  role.addToPolicy(new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'logs:CreateLogStream',
      'logs:PutLogEvents',
    ],
    resources: [ logGroup.logGroupArn, `${logGroup.logGroupArn}:log-stream:*`, ],
  },),);
  role.addToPolicy(new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'xray:PutTraceSegments',
      'xray:PutTelemetryRecords',
    ],
    resources: [ '*', ],
  },),);
  role.addToPolicy(new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [ 'sqs:SendMessage', ],
    resources: [ dlq.queueArn, ],
  },),);
  NagSuppressions.addResourceSuppressions(role, [
    { id: 'AwsSolutions-IAM5', reason: 'Log streams are created dynamically by Lambda; log-stream:* is the minimum scope. DefaultPolicy may contain Resource::* for DLQ (SQS) or other Lambda-managed permissions for Python functions as well.', },
  ], true,);
  return role;
};
