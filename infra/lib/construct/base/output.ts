import { CfnOutput, Fn, } from 'aws-cdk-lib';
import type { Construct, } from 'constructs';


type OutputProps = { value: string; exportName?: string };
type ImportOptions = { region?: string; roleArn?: string };


class Output extends CfnOutput {
  public constructor(scope: Construct, id: string, props: OutputProps,) {
    super(scope, id, {
      value: props.value,
      ...props.exportName ? { exportName: props.exportName, } : {},
    },);
    this.overrideLogicalId(id,);
  }

  public static import(stackName: string, id: string, options?: ImportOptions,): string {
    return Fn.getStackOutput(stackName, id, options?.region, options?.roleArn,);
  }
}


class OutputCrossStack extends Output {

  public constructor(scope: Construct, id: string, props: OutputProps,) {
    super(scope, OutputCrossStack.outputName(id,), props,);
  }

  public static override import(stackName: string, id: string, options?: ImportOptions,): string {
    return super.import(stackName, OutputCrossStack.outputName(id,), options,);
  }

  private static outputName(id: string,): string { return `CrossStack${id}`; }
}


export type { ImportOptions, };
export { Output, OutputCrossStack, };
