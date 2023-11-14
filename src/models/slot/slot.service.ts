import { Injectable } from '@nestjs/common';
import { Slot } from './slot.entity';
import SlotDto from './slot.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { BaseServiceWithTenant } from '../../common/with-tenant/with-tenant.service';

@Injectable()
export class SlotService extends BaseServiceWithTenant<Slot, SlotDto> {
  constructor(@InjectRepository(Slot) public repository: Repository<Slot>) {
    super('SlS');
  }

  async beforeInsert(
    createDto: SlotDto,
    user: User,
    ...args
  ): Promise<SlotDto> {
    return super.beforeInsert(createDto, user, ...args);
  }

  async beforeUpdate(
    id: string,
    user: User,
    updateDto: Partial<SlotDto>,
    record: Slot,
    ...args
  ): Promise<Partial<SlotDto>> {
    return super.beforeUpdate(id, user, updateDto, record, ...args);
  }
}
