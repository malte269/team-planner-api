import { ApiProperty } from '@nestjs/swagger';
import { DtoWithTenant } from '../../common/with-tenant/base.dto.with-tenant';
import { AsDto } from '../../helper/Typings';
import { Skill } from './skill.entity';

export class SkillDto
  extends DtoWithTenant<SkillDto>
  implements AsDto<Skill, keyof DtoWithTenant<SkillDto>>
{
  @ApiProperty()
  name: string;

  constructor(object: Partial<SkillDto>) {
    super(object);
    Object.assign(this, object);
  }
}
