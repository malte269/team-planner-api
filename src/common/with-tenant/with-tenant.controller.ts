import { BaseController, Relation } from '../base.controller';
import { BaseEntityWithTenant } from './base.entity.with-tenant';
import { BaseEntityWithOptionalTenant } from './base.entity.with-optional-tenant';
import { DtoWithTenant } from './base.dto.with-tenant';
import { User } from '../../models/user/user.entity';
import { TenantService } from '../../models/tenant/tenant.service';
import { BaseServiceWithTenant } from './with-tenant.service';
import { RelationKey } from '../../helper/Typings';
import { key } from '../base.entity';
import { Tenant } from '../../models/tenant/tenant.entity';

export abstract class BaseControllerWithTenant<
  Model extends
    | BaseEntityWithTenant<Model>
    | BaseEntityWithOptionalTenant<Model>,
  ModelDto extends DtoWithTenant<ModelDto>,
> extends BaseController<Model, ModelDto> {
  protected constructor(
    protected readonly service: BaseServiceWithTenant<Model, ModelDto>,
    protected readonly tenantService: TenantService,
    /**
     * Returns an Instance of the controllers model
     * @protected
     */
    protected readonly model: {
      new (...args): Model;
    },
  ) {
    super(service, model);
  }
  protected possibleRelations(user?: User): Relation<Model>[] {
    const tenantKey: RelationKey<BaseEntityWithTenant<Model>> = 'tenant';
    return super.possibleRelations(user).concat({
      property: tenantKey as RelationKey<Model>,
      serviceOrQuery: this.tenantService,
      relations: [key<Tenant>('settings')],
    });
  }
}
