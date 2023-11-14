import { ApiProperty } from '@nestjs/swagger';
import { User } from '../user/user.entity';
import { Project, ProjectStatus } from './project.entity';
import { DetailsDto } from '../../common/details/details.dto';
import { AsDto } from '../../helper/Typings';
import { PhaseDto } from '../phase/phase.dto';
import { IncrementDto } from '../increment/increment.dto';
import { GroupDto } from '../group/group.dto';
import { IssueDto } from '../issue/issue.dto';
import { SettingsDto } from '../settings/settings.dto';

export class ProjectDto
  extends DetailsDto<ProjectDto>
  implements
    AsDto<
      Project,
      | keyof DetailsDto<ProjectDto>
      | 'skills'
      | 'status'
      | 'issues'
      | 'modules'
      | 'users'
      | 'phases'
      | 'increments'
      | 'settingsId'
      | 'settings'
    >
{
  @ApiProperty()
  short: string;

  @ApiProperty({
    isArray: true,
    required: false,
  })
  skills?: string[];

  @ApiProperty({
    required: false,
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.PENDING,
  })
  status?: ProjectStatus;

  @ApiProperty({
    required: false,
  })
  settings?: SettingsDto;

  settingsId?: string;

  phases?: PhaseDto[];

  increments?: IncrementDto[];

  modules?: GroupDto[];

  issues?: IssueDto[];

  users?: User[];

  constructor(object: Partial<ProjectDto>) {
    super(object);
    Object.assign(this, object);
  }
}
