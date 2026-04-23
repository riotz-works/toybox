import { CfnOutput, } from 'aws-cdk-lib';
import { createApp, createBaseConfig, } from '../lib/config.js';
import { AppBaseInfraStack, } from '../lib/stack/app-base-infra.js';

const app = createApp();
const base = createBaseConfig(app,);


const appBaseInfraStack = new AppBaseInfraStack(app, 'AppBaseInfra', base,);
new CfnOutput(appBaseInfraStack, 'StackName', { value: appBaseInfraStack.stackName, },);
