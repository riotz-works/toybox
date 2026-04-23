import { createHash, } from 'node:crypto';
import { Role, type IManagedPolicy, type IRoleRef, type PolicyStatement, type RoleProps, } from 'aws-cdk-lib/aws-iam';
import { Construct, } from 'constructs';
import { idToName, type Config, } from '../../config.js';


type BaseRoleProps = Omit<RoleProps, 'permissionsBoundary'> & Config & {
  readonly permissionsBoundary?: IManagedPolicy;
};


class BaseRole extends Construct {

  private readonly role: Role;

  public get roleArn(): string { return this.role.roleArn; }
  public get roleRef(): IRoleRef { return this.role; }

  public constructor(scope: Construct, id: string, props: BaseRoleProps,) {
    super(scope, id,);

    const { roleName: _roleName, ...config } = props;
    this.role = new Role(this, 'Role', {
      roleName: BaseRole.toRoleName(_roleName ?? idToName(id, props,), props.suffix,),
      ...config, // 'props' last to allow overrides of defaults defined above
    },);
  }

  public addToPolicy(policy: PolicyStatement,): void {
    this.role.addToPolicy(policy,);
  }

  private static toRoleName(fullName: string, stageSuffix: string,): string {
    if (fullName.length <= 64) { return fullName; }
    const hash = createHash('sha256',).update(fullName,).digest('hex',).slice(0, 8,);
    const tail = `-${hash}${stageSuffix}`;
    const head = 64 - tail.length;
    if (head < 1) { throw new Error('toIamRoleName: cannot fit IAM role name within 64 chars',); }
    return `${fullName.slice(0, head,)}${tail}`;
  }
}


export { BaseRole, };
