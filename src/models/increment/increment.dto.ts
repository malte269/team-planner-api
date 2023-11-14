import { ApiProperty } from '@nestjs/swagger';
import { DetailsDto } from '../../common/details/details.dto';
import { AsDto } from '../../helper/Typings';
import { Increment } from './increment.entity';
import { PhaseDto } from '../phase/phase.dto';

export class IncrementDto
  extends DetailsDto<IncrementDto>
  implements
    AsDto<
      Increment,
      | keyof DetailsDto<IncrementDto>
      | 'incrementNumber'
      | 'issues'
      | 'modules'
      | 'phases'
    >
{
  // zero indexed number of increments
  @ApiProperty({
    default: 0,
  })
  incrementNumber?: number;

  @ApiProperty()
  projectId: string;

  @ApiProperty({
    required: false,
    isArray: true,
  })
  phases?: PhaseDto[];

  constructor(object: Partial<IncrementDto>) {
    super(object);
    Object.assign(this, object);
  }
}
