import { Stack, type StackProps, } from 'aws-cdk-lib';
import type { Construct, } from 'constructs';
import { idToName, type Config, } from '../../config.js';


type BaseStackProps = StackProps & Config;


class BaseStack extends Stack {

  public constructor(scope: Construct, id: string, props: BaseStackProps,) {
    super(scope, id, {
      stackName: props.stackName ?? idToName(id, props,),
      suppressTemplateIndentation: true,
      ...props, // 'props' last to allow overrides of defaults defined above
    },);
  }
}


export type { BaseStackProps, };
export { BaseStack, };
