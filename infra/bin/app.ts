import { CfnOutput, } from 'aws-cdk-lib';
import { createApp, createBaseConfig, } from '../lib/config.js';
import { AppBaseInfraStack, } from '../lib/stack/app-base-infra.js';
import { VoicevoxRuntimeStack, } from '../lib/stack/voicevox/runtime.js';

const app = createApp();
const base = createBaseConfig(app,);


const appBaseInfraStack = new AppBaseInfraStack(app, base,);
new CfnOutput(appBaseInfraStack, 'StackName', { value: appBaseInfraStack.stackName, },);

const voicevoxRuntimeStack = new VoicevoxRuntimeStack(app, {
  appBaseInfraStack,
  ...base,
},);
new CfnOutput(voicevoxRuntimeStack, 'StackName', { value: voicevoxRuntimeStack.stackName, },);
