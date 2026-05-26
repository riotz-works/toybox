/* eslint-disable @typescript-eslint/naming-convention -- 'cuz naming by aws-cdk */
import { Stack, type StackProps, } from 'aws-cdk-lib';
import { AccountRootPrincipal, CompositePrincipal, FederatedPrincipal, OpenIdConnectProvider, PolicyStatement, Role, } from 'aws-cdk-lib/aws-iam';
import { NagSuppressions, } from 'cdk-nag';
import type { Construct, } from 'constructs';
import { idToName, name, repo, type Config, } from '../config.js';


type AccountBaseInfraStackProps = StackProps & Config;


const STACK_ID = 'AccountBaseInfra' as const;
export class AccountBaseInfraStack extends Stack {

  public constructor(scope: Construct, props: AccountBaseInfraStackProps,) {
    super(scope, STACK_ID, {
      stackName: idToName(STACK_ID, props,),
      suppressTemplateIndentation: true,
      ...props,
    },);

    createRoles(this, props,);
    createRoute53(this, props,);
  }
}


const createRoute53 = (_scope: Construct, _props: Config,): void => { // eslint-disable-line @typescript-eslint/no-unused-vars -- 'cuz placeholder
  // Using Cloudflare DNS, so registration is handled in Cloudflare instead of creating a HostedZone here.
  // -> const zone = new HostedZone(scope, 'ApexZone', { zoneName: props.hostedZoneDomain, },);
};


const createRoles = (scope: Construct, props: Config,): void => {
  const provider = OpenIdConnectProvider.fromOpenIdConnectProviderArn(
    scope,
    'GitHubOidc',
    `arn:aws:iam::${props.env.account}:oidc-provider/token.actions.githubusercontent.com`,
  );


  const readonlyRole = new Role(scope, 'SysCiReadonlyRole', {
    roleName: `sys-ci-${name}-readonly${props.suffix}`,
    assumedBy: new FederatedPrincipal(
      provider.openIdConnectProviderArn,
      props.env.stage === 'prd' ? {
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


  const deployOidcPrincipal = new FederatedPrincipal(
    provider.openIdConnectProviderArn,
    props.env.stage === 'prd' ? {
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
  );

  const deployRole = new Role(scope, 'SysCiDeployRole', {
    roleName: `sys-ci-${name}-deploy${props.suffix}`,
    assumedBy: props.env.stage === 'np'
      ? new CompositePrincipal(deployOidcPrincipal, new AccountRootPrincipal(),) // 'cuz use to local deploy with CLI
      : deployOidcPrincipal,
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
};
