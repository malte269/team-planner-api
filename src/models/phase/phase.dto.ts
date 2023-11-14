import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../user/role/role.entity';
import { DetailsDto } from '../../common/details/details.dto';
import { AsDto } from '../../helper/Typings';
import { Phase } from './phase.entity';

export class PhaseDto
  extends DetailsDto<PhaseDto>
  implements
    AsDto<
      Phase,
      | keyof DetailsDto<PhaseDto>
      | 'projectId'
      | 'issues'
      | 'incrementId'
      | 'requiredRoles'
    >
{
  @ApiProperty({
    default: 0,
  })
  order: number;

  @ApiProperty()
  projectId?: string;

  @ApiProperty({
    required: false,
  })
  incrementId?: string;

  @ApiProperty({
    isArray: true,
    enum: Role,
    type: 'enum',
    example: [Role.DEVELOPER],
  })
  requiredRoles?: string | Role[];

  constructor(object: Partial<PhaseDto>) {
    super(object);
    Object.assign(this, object);
  }
}
