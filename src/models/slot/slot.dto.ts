import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from '../user/user.dto';
import { DateTime } from 'luxon';
import { Slot, SlotFrequency } from './slot.entity';
import { DtoWithTenant } from '../../common/with-tenant/base.dto.with-tenant';
import { AsDto } from '../../helper/Typings';

export default class SlotDto
  extends DtoWithTenant<SlotDto>
  implements
    AsDto<
      Slot,
      | 'userId'
      | 'moduleId'
      | 'incrementId'
      | 'phaseId'
      | keyof DtoWithTenant<SlotDto>
    >
{
  @ApiProperty({
    default: 0,
  })
  allocation: number;

  @ApiProperty()
  dateStart: DateTime | string;

  @ApiProperty()
  dateEnd: DateTime | string;

  @ApiProperty({
    enum: SlotFrequency,
    type: 'enum',
    example: SlotFrequency.DAILY,
  })
  frequency: SlotFrequency;

  @ApiProperty()
  projectId: string;

  @ApiProperty({
    nullable: true,
  })
  moduleId?: string;

  @ApiProperty()
  incrementId?: string;

  @ApiProperty()
  phaseId?: string;

  @ApiProperty()
  userId?: string;

  user?: UserDto;

  constructor(object?: Partial<SlotDto> & { userId: string }) {
    super(object);
    Object.assign(this, object);
  }
}
