import { User } from '../../models/user/user.entity';
import { BaseService } from '../base.service';
import { BaseEntityWithTenant } from './base.entity.with-tenant';
import { BaseEntityWithOptionalTenant } from './base.entity.with-optional-tenant';
import { DtoWithTenant } from './base.dto.with-tenant';
import { SelectQueryBuilder } from 'typeorm';

export abstract class BaseServiceWithTenant<
  Model extends
    | BaseEntityWithTenant<Model>
    | BaseEntityWithOptionalTenant<Model>,
  ModelDto extends DtoWithTenant<ModelDto>,
> extends BaseService<Model, ModelDto> {
  protected constructor(short?: string) {
    super(short);
  }

  public createQueryBuilder(
    user: User,
    alias?: string,
  ): SelectQueryBuilder<Model> {
    const query = super.createQueryBuilder(user, alias);
    // if not a global user, add the tenantId check
    if (user.tenantId) {
      query.andWhere(`${query.alias}.tenantId = :${this.short}TenantId`, {
        [`${this.short}TenantId`]: user.tenantId,
      });
    }
    return query;
  }

  async create(createDto: ModelDto, user: User, ...args): Promise<Model> {
    if (user.tenantId) {
      createDto.tenantId = user.tenantId;
    }
    return super.create(createDto, user, ...args);
  }
}
