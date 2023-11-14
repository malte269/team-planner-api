import { ApiProperty } from '@nestjs/swagger';
import { Issue, IssueStatus, IssueType } from './issue.entity';
import { DetailsDto } from '../../common/details/details.dto';
import { AsDto, ObjectWithId } from '../../helper/Typings';
import { PhaseDto } from '../phase/phase.dto';
import { IncrementDto } from '../increment/increment.dto';
import { GroupDto } from '../group/group.dto';

export class IssueDto
  extends DetailsDto<IssueDto>
  implements
    AsDto<
      Issue,
      | keyof DetailsDto<IssueDto>
      | 'skills'
      | 'userId'
      | 'incrementId'
      | 'groupId'
      | 'phaseId'
      | 'parentId'
      | 'status'
      | 'children'
      | 'following'
      | 'previous'
    >
{
  @ApiProperty({
    enum: IssueType,
    example: IssueType.USER_STORY,
  })
  type: IssueType;

  @ApiProperty({
    isArray: true,
    required: false,
  })
  skills?: string[];

  @ApiProperty({
    required: false,
  })
  userId?: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty({
    required: false,
  })
  incrementId?: string;

  @ApiProperty({
    required: false,
  })
  groupId?: string;

  @ApiProperty({
    required: false,
  })
  phaseId?: string;

  @ApiProperty({
    required: false,
  })
  parentId?: string;

  @ApiProperty({
    required: false,
    enum: IssueStatus,
    type: 'enum',
    example: IssueStatus.UNTOUCHED,
  })
  status?: IssueStatus;

  @ApiProperty({
    isArray: true,
    required: false,
  })
  following?: ObjectWithId<Issue>[];

  @ApiProperty({
    isArray: true,
    required: false,
  })
  previous?: ObjectWithId<Issue>[];

  teamSize?: 1;

  children?: IssueDto[];

  identifier: string;

  phase?: PhaseDto;
  increment?: IncrementDto;
  group?: GroupDto;

  constructor(object: Partial<IssueDto>) {
    super(object);
    Object.assign(this, object);
  }
}
