import { CfnOutput, } from 'aws-cdk-lib';
import { createApp, createBaseConfig, } from '../lib/config.js';
import { VoicevoxRuntimeStack, } from '../lib/stack/voicevox/runtime.js';

const app = createApp();
const base = createBaseConfig(app,);


const voicevoxRuntimeStack = new VoicevoxRuntimeStack(app, base,);
new CfnOutput(voicevoxRuntimeStack, 'StackName', { value: voicevoxRuntimeStack.stackName, },);
