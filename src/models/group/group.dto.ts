import { ApiProperty } from '@nestjs/swagger';
import { DetailsDto } from '../../common/details/details.dto';
import { AsDto } from '../../helper/Typings';
import { Group } from './group.entity';

export class GroupDto
  extends DetailsDto<GroupDto>
  implements
    AsDto<
      Group,
      keyof DetailsDto<GroupDto> | 'parentId' | 'children' | 'issues' | 'phases'
    >
{
  @ApiProperty()
  projectId: string;

  @ApiProperty()
  parentId?: string;

  constructor(object: Partial<GroupDto>) {
    super(object);
    Object.assign(this, object);
  }
}
