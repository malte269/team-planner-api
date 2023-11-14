import { ApiProperty } from '@nestjs/swagger';
import { TenantDto } from '../../models/tenant/tenant.dto';
import { Dto } from '../base.dto';
import { AsDto } from '../../helper/Typings';
import { BaseEntityWithTenant } from './base.entity.with-tenant';

export abstract class DtoWithTenant<DtoModel>
  extends Dto<DtoModel>
  implements
    AsDto<
      BaseEntityWithTenant<any>,
      keyof Dto<DtoModel> | 'tenantId' | 'tenant'
    >
{
  @ApiProperty({
    nullable: false,
    required: false,
  })
  tenantId?: string;

  tenant?: TenantDto;

  protected constructor(object?: Partial<DtoModel>) {
    super(object);
    if (object) {
      Object.assign(this, object);
    }
  }
}
