import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from '../user/user.dto';
import { Weekdays, WorkTime } from './workTime.entity';
import { DateTime } from 'luxon';
import { Dto } from '../../common/base.dto';
import { AsDto } from '../../helper/Typings';

export default class WorkTimeDto
  extends Dto<WorkTimeDto>
  implements
    Weekdays,
    AsDto<
      WorkTime,
      | keyof Weekdays
      | keyof Dto<WorkTimeDto>
      | 'weeklyAmount'
      | 'validFrom'
      | 'validTo'
      | 'userId'
    >
{
  @ApiProperty({
    default: 0,
  })
  monday?: number;

  @ApiProperty({
    default: 0,
  })
  tuesday?: number;

  @ApiProperty({
    default: 0,
  })
  wednesday?: number;

  @ApiProperty({
    default: 0,
  })
  thursday?: number;

  @ApiProperty({
    default: 0,
  })
  friday?: number;

  @ApiProperty({
    description:
      'Ein bestimmter Stundensatz pro Woche. Kann zur Validierung der Tage herangezogen werden, oder wird aus diesen' +
      ' berechnet. Werden keine weiteren Tage angegeben, wird der tägliche Satz aus diesem Wert berechnet',
    default: 0,
  })
  weeklyAmount?: number;

  @ApiProperty({
    description: 'If no value is set, "now" is used as default value',
    required: false,
  })
  validFrom?: DateTime | string;

  @ApiProperty({
    required: false,
  })
  validTo?: DateTime | string;

  @ApiProperty()
  userId?: string;

  user?: UserDto;

  constructor(object?: Partial<WorkTimeDto> & { userId: string }) {
    super(object);
    Object.assign(this, object);
  }
}
