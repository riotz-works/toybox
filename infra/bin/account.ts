import { CfnOutput, } from 'aws-cdk-lib';
import { createApp, createAccountConfig, } from '../lib/config.js';
import { AccountBaseInfraStack, } from '../lib/stack/account-base-infra.js';

const app = createApp({ context: { region: 'us-east-1', }, },);
const config = createAccountConfig(app,);

const accountBaseInfraStack = new AccountBaseInfraStack(app, 'AccountBaseInfra', config,);
new CfnOutput(accountBaseInfraStack, 'StackName', { value: accountBaseInfraStack.stackName, },);
