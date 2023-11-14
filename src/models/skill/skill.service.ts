import { Injectable } from '@nestjs/common';
import { Skill } from './skill.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkillDto } from './skill.dto';
import { ResException } from '../../common/ResException';
import { SKILL_ERROR_CREATE } from './skill.enums';
import { User } from '../user/user.entity';
import { BaseServiceWithTenant } from '../../common/with-tenant/with-tenant.service';

@Injectable()
export class SkillService extends BaseServiceWithTenant<Skill, SkillDto> {
  constructor(@InjectRepository(Skill) public repository: Repository<Skill>) {
    super('SkS');
  }

  async beforeInsert(createDto: SkillDto, user: User): Promise<SkillDto> {
    if (!createDto.name) {
      throw new ResException(SKILL_ERROR_CREATE.MISSING_NAME);
    }

    if (createDto.name.includes(',') || createDto.name.includes('+')) {
      // No commas allowed, because it is stored as type "simple array" that is a comma separated string. A comma in
      // its name would break the behaviour. Also, a "+" is not allowed, because of user skill behaviour
      throw new ResException(SKILL_ERROR_CREATE.INVALID_CHARACTER);
    }

    const uniqueExists = await this.count({
      name: createDto.name,
      deleted: false,
    });
    if (uniqueExists) {
      throw new ResException(SKILL_ERROR_CREATE.UNIQUE);
    }

    return super.beforeInsert(createDto, user);
  }
}
