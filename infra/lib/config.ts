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
  dev: '807845208391',
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
    case 'dev': return { ...dev(app,), suffix: '', };
    case 'prd': return { ...prd(app,), suffix: '', };
    default:
      throw new Error(`Invalid stage: ${stage(app,)}. Only 'dev' and 'prd' exist at the account level.`,);
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
    account: context(app, 'account', accounts.dev,),
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
    account: context(app, 'account', accounts.dev,),
    region: context(app, 'region', 'us-east-2',),
    stage: stage(app,),
  },
  auth: {
    callbackUrls: [ `https://${stage(app,)}.np.${domain}/api/auth/callback`, ],
    logoutUrls: [ `https://${stage(app,)}.np.${domain}/api/auth/logout`, ],
  },
  retention: RetentionDays.ONE_WEEK,
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
    callbackUrls: [ `https://${domain}/api/auth/callback`, ],
    logoutUrls: [ `https://${domain}/api/auth/logout`, ],
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
export { accounts, createApp, createAccountConfig, idToName, name, repo, };
