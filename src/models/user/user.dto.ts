import { ApiProperty } from '@nestjs/swagger';
import { Validate } from 'class-validator';
import { EmailValidation } from '../../helper/validation';
import WorkTimeDto from '../work-time/workTime.dto';
import { DtoWithTenant } from '../../common/with-tenant/base.dto.with-tenant';
import { Role } from './role/role.entity';
import { AsDto, RelationKey } from '../../helper/Typings';
import { User } from './user.entity';
import SlotDto from '../slot/slot.dto';

export class UserDto
  extends DtoWithTenant<UserDto>
  implements
    AsDto<
      User,
      | keyof DtoWithTenant<UserDto>
      | RelationKey<User>
      | 'email'
      | 'password'
      | 'skills'
      | 'income'
      | 'isExpert'
      | 'role'
    >
{
  @ApiProperty({
    required: false,
  })
  @Validate(EmailValidation)
  email?: string | null;

  @ApiProperty({
    nullable: true,
    default: null,
  })
  password?: string | null;

  @ApiProperty({
    required: true,
  })
  firstName: string;

  @ApiProperty({
    required: true,
  })
  lastName: string;

  @ApiProperty({
    required: false,
    isArray: true,
  })
  skills?: string[];

  @ApiProperty({
    required: false,
    default: [new WorkTimeDto()],
  })
  workTimes?: WorkTimeDto[];

  @ApiProperty()
  income?: number;

  @ApiProperty({
    required: false,
    default: false,
  })
  isExpert?: boolean;

  @ApiProperty({
    enum: Role,
    type: 'enum',
    example: Role.DEVELOPER,
  })
  role?: Role;

  slots?: SlotDto[];

  projects?: any[];

  issues?: any[];

  constructor(object: Partial<UserDto>) {
    super(object);
    Object.assign(this, object);
  }
}
