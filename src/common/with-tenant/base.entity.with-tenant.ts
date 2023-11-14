import { Column, JoinColumn, ManyToOne } from 'typeorm';
import { HasTenant } from './has-tenant.interface';
import { BaseEntity } from '../base.entity';
import { Tenant } from '../../models/tenant/tenant.entity';

/**
 * Use this instead of `BaseEntity` for all Models, so we could easily implement safe and fast queries.
 */
export abstract class BaseEntityWithTenant<Model extends BaseEntity<Model>>
  extends BaseEntity<Model>
  implements HasTenant
{
  /**
   * One way relation to a tenant.
   *
   * If `null` the record is a system resource.
   */
  @ManyToOne(() => Tenant)
  @JoinColumn()
  tenant?: Tenant;

  /**
   * This column is implicitly maintained by nest.js
   * @see https://typeorm.io/relations-faq#how-to-use-relation-id-without-joining-relation
   */
  @Column({
    update: false,
  })
  tenantId: string;
}
