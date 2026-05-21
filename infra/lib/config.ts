import { App, Aspects, RemovalPolicy, Tags, type AppProps, type Environment, } from 'aws-cdk-lib';
import type { PointInTimeRecoverySpecification, } from 'aws-cdk-lib/aws-dynamodb';
import { RetentionDays, } from 'aws-cdk-lib/aws-logs';
import { AwsSolutionsChecks, ServerlessChecks, } from 'cdk-nag';
import pkg from '../../package.json' with { type: 'json', };
import { toKebabCase, } from './util.js';

const { name, repository, } = pkg;
const project = name.slice(0, name.indexOf('-',),);
const repo = repository.url.split('/',).slice(-2,).join('/',).replace(/\.git$/u, '',);

const accounts = {
  np: '807845208391',
  prd: '807845208391',
};

const domain = '';


const context = <T extends string,> (app: App, key: string, defaultValue: T,): T => app.node.tryGetContext(key,) ?? defaultValue; // eslint-disable-line @typescript-eslint/no-unsafe-return -- 'cuz context from cli args
const stage = (app: App,): string => context(app, 'stage', 'poc',);

const idToName = (id: string, props: Config,): string => `${toKebabCase(name,)}-${toKebabCase(id,)}${props.suffix}`;


const createApp = (props?: AppProps,): App => {
  const app = new App(props,);
  Tags.of(app,).add('project', project,);
  Tags.of(app,).add('service', name,);
  Aspects.of(app,).add(new AwsSolutionsChecks(),);
  Aspects.of(app,).add(new ServerlessChecks(),);
  return app;
};

const createAccountConfig = (app: App,): Config => ((): Config => {
  switch (stage(app,)) {
    case 'np': return dev(app,);
    case 'prd': return prd(app,);
    default:
      throw new Error(`Invalid stage: ${stage(app,)}. Only 'np' and 'prd' exist at the account level.`,);
  }
})();

const createBaseConfig = (app: App,): Config => ((): Config => {
  const stageName = stage(app,);
  if (stageName.startsWith('qa',)) {
    return qas(app,);
  }
  switch (stageName) {
    case 'dev': return dev(app,);
    case 'stg': return stg(app,);
    case 'prd': return prd(app,);
    default:
      return base(app,);
  }
})();


type LogLevel = 'DEBUG' | 'INFO';

type Config = {
  env: Required<Environment> & { stage: string };
  domain: string;
  suffix: string;
  auth: { callbackUrls: string[]; logoutUrls: string[] };
  logLevel: LogLevel;
  retention: RetentionDays;
  removalPolicy: RemovalPolicy;
  terminationProtection: boolean;
  memorySize: number;                                                 // Lambda configuration
  deletionProtection: boolean;                                        // DynamoDB Table configuration
  pointInTimeRecoverySpecification: PointInTimeRecoverySpecification; // DynamoDB Table configuration
};

const base = (app: App,): Config => ({
  env: {
    account: context(app, 'account', accounts.np,),
    region: context(app, 'region', 'us-east-2',),
    stage: stage(app,),
  },
  domain: `${stage(app,)}.np.${domain}`,
  suffix: `-${stage(app,)}`,
  auth: {
    callbackUrls: [ `https://${stage(app,)}.np.${domain}/api/auth/callback`, 'http://localhost:5173/auth/callback/cognito', ],
    logoutUrls: [ `https://${stage(app,)}.np.${domain}/api/auth/logout`, 'http://localhost:5173/auth/login', ],
  },
  logLevel: 'DEBUG',
  retention: RetentionDays.ONE_DAY,
  removalPolicy: RemovalPolicy.DESTROY,
  terminationProtection: false,
  deletionProtection: false,
  memorySize: 128,
  pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: false, },
});

const dev = (app: App,): Config => ({
  ...base(app,),
  env: {
    account: context(app, 'account', accounts.np,),
    region: context(app, 'region', 'us-east-2',),
    stage: stage(app,),
  },
  auth: {
    callbackUrls: [ `https://${stage(app,)}.np.${domain}/auth/callback`, ],
    logoutUrls: [ `https://${stage(app,)}.np.${domain}/auth/logout`, ],
  },
  retention: RetentionDays.ONE_WEEK,
});

const qas = (app: App,): Config => ({
  ...base(app,),
  env: {
    account: context(app, 'account', accounts.np,),
    region: context(app, 'region', 'us-west-2',),
    stage: stage(app,),
  },
  auth: {
    callbackUrls: [ `https://${stage(app,)}.np.${domain}/auth/callback`, ],
    logoutUrls: [ `https://${stage(app,)}.np.${domain}/auth/logout`, ],
  },
  retention: RetentionDays.THREE_MONTHS,
});

const stg = (app: App,): Config => ({
  ...base(app,),
  env: {
    account: context(app, 'account', accounts.prd,),
    region: context(app, 'region', 'us-west-2',),
    stage: stage(app,),
  },
  domain: `${stage(app,)}.${domain}`,
  auth: {
    callbackUrls: [ `https://${stage(app,)}.${domain}/auth/callback`, ],
    logoutUrls: [ `https://${stage(app,)}.${domain}/auth/logout`, ],
  },
  logLevel: 'INFO',
  retention: RetentionDays.SIX_MONTHS,
  removalPolicy: RemovalPolicy.RETAIN,
  terminationProtection: true,
  memorySize: 3 * 1024, // Expecting ~2–3 vCPUs at this memory size (based on observed behavior; not guaranteed by AWS)
  deletionProtection: true,
  pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true, },
});

const prd = (app: App,): Config => ({
  env: {
    account: context(app, 'account', accounts.prd,),
    region: context(app, 'region', 'us-west-2',),
    stage: stage(app,),
  },
  domain,
  suffix: '',
  auth: {
    callbackUrls: [ `https://${domain}/auth/callback`, ],
    logoutUrls: [ `https://${domain}/auth/logout`, ],
  },
  logLevel: 'INFO',
  retention: RetentionDays.ONE_YEAR,
  removalPolicy: RemovalPolicy.RETAIN,
  terminationProtection: true,
  memorySize: 3 * 1024, // Expecting ~2–3 vCPUs at this memory size (based on observed behavior; not guaranteed by AWS)
  deletionProtection: true,
  pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true, },
});


export type { Config, };
export { createApp, createAccountConfig, createBaseConfig, idToName, name, repo, };
