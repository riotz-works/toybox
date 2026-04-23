/* eslint-disable @typescript-eslint/naming-convention -- 'cuz naming by aws-cdk */
import { Stack, type StackProps, } from 'aws-cdk-lib';
import { FederatedPrincipal, OpenIdConnectProvider, PolicyStatement, Role, } from 'aws-cdk-lib/aws-iam';
import { NagSuppressions, } from 'cdk-nag';
import { Construct, } from 'constructs';
import { accounts, idToName, name, repo, type Config, } from '../config.js';


type AccountBaseInfraStackProps = StackProps & Config;


export class AccountBaseInfraStack extends Stack {

  public constructor(scope: Construct, id: string, props: AccountBaseInfraStackProps,) {
    super(scope, id, {
      stackName: props.stackName ?? idToName(id, props,),
      suppressTemplateIndentation: true,
      ...props,
    },);

    new Roles(this, 'Roles', props,);
  }
}


class Roles extends Construct {

  public constructor(scope: Construct, id: string, props: AccountBaseInfraStackProps,) {
    super(scope, id,);

    const provider = OpenIdConnectProvider.fromOpenIdConnectProviderArn(
      this,
      'GitHubOidc',
      `arn:aws:iam::${props.env.account}:oidc-provider/token.actions.githubusercontent.com`,
    );

    const readonlyRole = new Role(this, 'SysCiReadonlyRole', {
      roleName: `sys-ci-${name}-readonly`,
      assumedBy: new FederatedPrincipal(
        provider.openIdConnectProviderArn,
        props.env.account === accounts.prd && accounts.dev !== accounts.prd ? {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
            'token.actions.githubusercontent.com:sub': [
              `repo:${repo}:ref:refs/heads/stable`,
              `repo:${repo}:ref:refs/heads/production`,
            ],
          },
        } : {
          StringEquals: { 'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com', },
          StringLike: { 'token.actions.githubusercontent.com:sub': `repo:${repo}:ref:refs/heads/*`, },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
    },);
    readonlyRole.addToPolicy(new PolicyStatement({
      actions: [
        'cloudformation:DescribeStacks',
        'cloudformation:ListExports',
        'cloudformation:ListStacks',
      ],
      resources: [ '*', ],
    },),);
    NagSuppressions.addResourceSuppressions(readonlyRole, [
      { id: 'AwsSolutions-IAM5', reason: 'CloudFormation List/Describe actions do not support resource-level restrictions.', },
    ], true,);

    const deployRole = new Role(this, 'SysCiDeployRole', {
      roleName: `sys-ci-${name}-deploy`,
      assumedBy: new FederatedPrincipal(
        provider.openIdConnectProviderArn,
        props.env.account === accounts.prd && accounts.dev !== accounts.prd ? {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
            'token.actions.githubusercontent.com:sub': [
              `repo:${repo}:ref:refs/heads/stable`,
              `repo:${repo}:ref:refs/heads/production`,
            ],
          },
        } : {
          StringEquals: { 'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com', },
          StringLike: {
            'token.actions.githubusercontent.com:sub': [
              `repo:${repo}:ref:refs/heads/main`,
              `repo:${repo}:ref:refs/heads/qa/*`,
            ],
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
    },);
    deployRole.addToPolicy(new PolicyStatement({
      actions: [
        'cloudformation:DescribeStacks',
        'cloudformation:ListExports',
        'cloudformation:ListStacks',
      ],
      resources: [ '*', ],
    },),);
    deployRole.addToPolicy(new PolicyStatement({
      actions: [ 'ssm:GetParameter', ],
      resources: [ `arn:aws:ssm:*:${props.env.account}:parameter/cdk-bootstrap/*`, ],
    },),);
    deployRole.addToPolicy(new PolicyStatement({
      actions: [ 'sts:AssumeRole', ],
      resources: [ `arn:aws:iam::${props.env.account}:role/cdk-hnb659fds-*`, ],
    },),);
    NagSuppressions.addResourceSuppressions(deployRole, [
      { id: 'AwsSolutions-IAM5', reason: 'CloudFormation List/Describe actions do not support resource-level restrictions.', },
      { id: 'AwsSolutions-IAM5', reason: 'CDK bootstrap role name is wildcarded for environment-specific roles.', },
    ], true,);
  }
}
