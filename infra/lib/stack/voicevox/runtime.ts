/* eslint-disable @typescript-eslint/naming-convention -- 'cuz naming by aws-cdk */
import path from 'node:path';
import { fileURLToPath, } from 'node:url';
import { Size, } from 'aws-cdk-lib';
import { AccountPrincipal, } from 'aws-cdk-lib/aws-iam';
import { DockerImageCode, FunctionUrlAuthType, } from 'aws-cdk-lib/aws-lambda';
import type { Construct, } from 'constructs';
import { path as appPath, } from '../../../../app/voicevox/index.js';
import type { Config, } from '../../config.js';
import { BaseDockerImageFunction, BaseStack, Output, type BaseStackProps, } from '../../construct/base/index.js';
import type { AppBaseInfraStack, } from '../app-base-infra.js';


type VoicevoxRuntimeStackProps = BaseStackProps & Config & {
  readonly appBaseInfraStack: AppBaseInfraStack;
};


const STACK_ID = 'VoicevoxRuntime' as const;
export class VoicevoxRuntimeStack extends BaseStack {

  public constructor(scope: Construct, props: VoicevoxRuntimeStackProps,) {
    super(scope, STACK_ID, props,);
    this.node.addDependency(props.appBaseInfraStack,);

    const lambda = new BaseDockerImageFunction(this, 'Voicevox', {
      code: DockerImageCode.fromImageAsset(path.dirname(fileURLToPath(appPath,),),),
      ephemeralStorageSize: Size.mebibytes(2 * 1024,),
      environment: {
        AWS_LWA_PORT: '50021',
        AWS_LWA_READINESS_CHECK_PATH: '/version',
        HOME: '/tmp',
      },
      ...props,
    },);

    const functionUrl = lambda.addFunctionUrl({ authType: FunctionUrlAuthType.AWS_IAM, },);
    functionUrl.grantInvokeUrl(new AccountPrincipal(this.account,),);


    new Output(this, 'FunctionUrl', functionUrl.url,);
  }
}
