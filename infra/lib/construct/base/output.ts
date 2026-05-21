import { CfnOutput, Fn, } from 'aws-cdk-lib';
import type { Construct, } from 'constructs';


type CrossStackOutputProps = {
  value: string;
  exportName?: string;
};

type CrossStackImportOptions = {
  region?: string;
  roleArn?: string;
};


class OutputCrossStack extends CfnOutput {

  private static outputName(id: string,): string {
    return `CrossStack${id}`;
  }

  public constructor(scope: Construct, id: string, props: CrossStackOutputProps,) {
    const outputKey = OutputCrossStack.outputName(id,);
    super(scope, outputKey, {
      value: props.value,
      ...props.exportName ? { exportName: props.exportName, } : {},
    },);
    this.overrideLogicalId(outputKey,);
  }

  public static import(stackName: string, id: string, options?: CrossStackImportOptions,): string {
    return Fn.getStackOutput(
      stackName,
      OutputCrossStack.outputName(id,),
      options?.region,
      options?.roleArn,
    );
  }
}


export type { CrossStackImportOptions, };
export { OutputCrossStack, };
