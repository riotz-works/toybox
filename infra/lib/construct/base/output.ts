import { CfnOutput, Fn, } from 'aws-cdk-lib';
import { Construct, } from 'constructs';
import { name, type Config, } from '../../config.js';


type OutputProps = {
  env: {
    stage: string;
  };
};


class Output extends Construct {
  public constructor(scope: Construct, id: string, value: string, exportName?: string,) {
    super(scope, id,);
    new CfnOutput(this, id, exportName ? { value, exportName, } : { value, },);
  }

  public static importValue(key: string, exportName: string, props: OutputProps,): string {
    return Fn.importValue(`${name}:${key}:${props.env.stage}:${exportName}`,);
  }
}


class OutputCrossStack extends Output {

  public constructor(scope: Construct, id: string, value: string, exportName: string, props: Config,) {
    super(scope, `CrossStack${id}`, value, `${name}:xref:${props.env.stage}:${exportName}`,);
  }

  public static import(exportName: string, props: OutputProps,): string {
    return super.importValue('xref', exportName, props,);
  }
}


export type { OutputProps, };
export { OutputCrossStack, };
