import { ApiProperty } from '@nestjs/swagger';
import { Dto } from '../../common/base.dto';
import { AsDto } from '../../helper/Typings';
import { Tenant } from './tenant.entity';
import { SettingsDto } from '../settings/settings.dto';

export class TenantDto
  extends Dto<TenantDto>
  implements
    AsDto<
      Tenant,
      keyof Dto<TenantDto> | 'users' | 'projects' | 'settingsId' | 'settings'
    >
{
  @ApiProperty({
    required: true,
  })
  name: string;

  @ApiProperty({
    required: false,
  })
  settings?: SettingsDto;

  settingsId?: string;

  constructor(object: Partial<TenantDto>) {
    super(object);
    Object.assign(this, object);
  }
}
