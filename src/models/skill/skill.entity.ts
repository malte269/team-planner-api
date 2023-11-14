import { Column, Entity, Index } from 'typeorm';
import { BaseEntityWithTenant } from '../../common/with-tenant/base.entity.with-tenant';

@Entity()
// skill is unique per tenant
@Index(['name', 'tenantId'], { unique: true })
export class Skill extends BaseEntityWithTenant<Skill> {
  @Column()
  name: string;

  constructor(object: Partial<Skill>) {
    super();
    Object.assign(this, object);
  }
}
