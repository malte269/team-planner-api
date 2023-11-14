import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Phase } from './phase.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PhaseDto } from './phase.dto';
import { User } from '../user/user.entity';
import { BaseServiceWithTenant } from '../../common/with-tenant/with-tenant.service';
import { IncrementService } from '../increment/increment.service';
import { ProjectService } from '../project/project.service';
import { ResException } from '../../common/ResException';
import { PHASE_ERROR_CREATE } from './phase.enums';
import { Increment } from '../increment/increment.entity';
import { key } from '../../common/base.entity';
import { Project } from '../project/project.entity';

@Injectable()
export class PhaseService extends BaseServiceWithTenant<Phase, PhaseDto> {
  constructor(
    @InjectRepository(Phase) public repository: Repository<Phase>,
    @Inject(forwardRef(() => ProjectService))
    private readonly projectService: ProjectService,
    @Inject(forwardRef(() => IncrementService))
    private readonly incrementService: IncrementService,
  ) {
    super('PhaS');
  }

  async beforeInsert(createDto: PhaseDto, user: User): Promise<PhaseDto> {
    let projectCheckNeeded = true;
    let newPhaseOrder = 0;
    if (createDto.incrementId) {
      let increment: Increment;
      try {
        // check for increment
        const incrementsQuery = this.incrementService
          .createQueryBuilder(user)
          .andWhereInIds(createDto.incrementId);
        increment = await incrementsQuery
          .leftJoinAndSelect(
            `${incrementsQuery.alias}.${key<Increment>('phases')}`,
            `${key<Increment>('phases')}`,
          )
          .getOneOrFail();
      } catch (e) {
        throw new ResException(PHASE_ERROR_CREATE.INCREMENT_NOT_FOUND);
      }
      projectCheckNeeded = false;
      createDto.projectId = createDto.projectId ?? increment.projectId;
      if (createDto.projectId !== increment.projectId) {
        throw new ResException(PHASE_ERROR_CREATE.ID_MISS_MATCH);
      }
      if (increment.phases.find((phase) => phase.order === createDto.order)) {
        throw new ResException(PHASE_ERROR_CREATE.UNIQUE);
      }
      newPhaseOrder = increment.phases.length;
    }
    if (!createDto.projectId) {
      throw new ResException(PHASE_ERROR_CREATE.PROJECT_NOT_FOUND);
    }

    if (projectCheckNeeded) {
      let project: Project;
      try {
        // check for project if needed
        const projectQuery = this.projectService
          .createQueryBuilder(user)
          .andWhereInIds(createDto.projectId);
        project = await projectQuery
          .leftJoinAndSelect(
            `${projectQuery.alias}.${key<Project>('phases')}`,
            `${key<Project>('phases')}`,
          )
          .getOneOrFail();
      } catch (e) {
        throw new ResException(PHASE_ERROR_CREATE.PROJECT_NOT_FOUND);
      }
      if (project.phases.find((phase) => phase.order === createDto.order)) {
        throw new ResException(PHASE_ERROR_CREATE.UNIQUE);
      }
      newPhaseOrder = project.phases.length;
    }
    if (createDto.order === undefined || createDto.order === null) {
      createDto.order = newPhaseOrder;
    }
    return super.beforeInsert(createDto, user);
  }

  async beforeUpdate(
    id: string,
    user: User,
    updateDto: Partial<PhaseDto>,
    record: Phase,
    ...args: any[]
  ): Promise<Partial<PhaseDto>> {
    return super.beforeUpdate(id, user, updateDto, record, ...args);
  }
}
