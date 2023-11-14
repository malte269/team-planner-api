import { Injectable } from '@nestjs/common';
import { Group } from './group.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupDto } from './group.dto';
import { BaseServiceWithTenant } from '../../common/with-tenant/with-tenant.service';

@Injectable()
export class GroupService extends BaseServiceWithTenant<Group, GroupDto> {
  constructor(@InjectRepository(Group) public repository: Repository<Group>) {
    super('Gs');
  }
}
