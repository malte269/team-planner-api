import { DateTime } from 'luxon';
import { DtoWithTenant } from '../with-tenant/base.dto.with-tenant';
import { ApiProperty } from '@nestjs/swagger';
import { DetailsEntity } from './details.entity';
import { AsDto } from '../../helper/Typings';
import { DurationUnit } from '../interfaces/timeline.interface';

export abstract class DetailsDto<Model extends DtoWithTenant<Model>>
  extends DtoWithTenant<Model>
  implements
    AsDto<
      DetailsEntity<any>,
      | keyof DtoWithTenant<Model>
      | 'description'
      | 'startDateSoft'
      | 'startDateHard'
      | 'endDateSoft'
      | 'endDateHard'
      | 'duration'
      | 'unit'
      | 'teamSize'
    >
{
  @ApiProperty()
  name: string;

  @ApiProperty()
  description?: string;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  startDateSoft?: DateTime | string;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  startDateHard?: DateTime | string;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  endDateSoft?: DateTime | string;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  endDateHard?: DateTime | string;

  @ApiProperty()
  duration?: number;

  @ApiProperty()
  unit?: DurationUnit;

  @ApiProperty({
    default: 1,
    required: false,
  })
  teamSize?: number;
}
