import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Increment } from './increment.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IncrementDto } from './increment.dto';
import { User } from '../user/user.entity';
import { BaseServiceWithTenant } from '../../common/with-tenant/with-tenant.service';
import { getArray } from '../../helper/helper-functions';
import { PhaseService } from '../phase/phase.service';
import { key } from '../../common/base.entity';
import { Phase } from '../phase/phase.entity';
import { ResException } from '../../common/ResException';
import { INCREMENT_ERROR_CREATE } from './increment.enums';

@Injectable()
export class IncrementService extends BaseServiceWithTenant<
  Increment,
  IncrementDto
> {
  constructor(
    @InjectRepository(Increment) public repository: Repository<Increment>,
    @Inject(forwardRef(() => PhaseService))
    private readonly phaseService: PhaseService,
  ) {
    super('IncS');
  }

  async beforeInsert(
    createDto: IncrementDto,
    user: User,
  ): Promise<IncrementDto> {
    return super.beforeInsert(createDto, user);
  }

  protected async afterInsert(
    record: Increment,
    createDto: IncrementDto,
    user: User,
    ...args: any[]
  ): Promise<Increment> {
    const phaseQuery = this.phaseService
      .createQueryBuilder(user)
      .andWhere(`${key<Phase>('projectId')} = :projectId`, {
        projectId: record.projectId,
      })
      .andWhere(`${key<Phase>('incrementId')} IS NULL`);
    const defaultPhases = await phaseQuery
      .orderBy(`${phaseQuery.alias}.${key<Phase>('order')}`, 'ASC')
      .getMany();
    let i = 0;
    // go slowly through the phases, in case they are malformed
    for (const phase of getArray(
      createDto.phases,
      // default are the projects phases
      defaultPhases,
    )) {
      phase.incrementId = record.id;
      phase.tenantId = record.tenantId;
      phase.order = i;
      try {
        await this.phaseService.create(phase, user);
        i++;
      } catch (e) {
        // if no phase was created, create the default ones
        if (i === 0) {
          await Promise.all(
            defaultPhases.map((phase) => {
              // add incrementId. Order is the same in project
              phase.incrementId = record.id;
              return this.phaseService.create(phase, user);
            }),
          );
        }
        // then throw an error
        throw new ResException(INCREMENT_ERROR_CREATE.MALFORMED_PHASES);
      }
    }
    return super.afterInsert(record, createDto, user, ...args);
  }

  async beforeUpdate(
    id: string,
    user: User,
    updateDto: Partial<IncrementDto>,
    record: Increment,
    ...args: any[]
  ): Promise<Partial<IncrementDto>> {
    delete updateDto.phases;
    return super.beforeUpdate(id, user, updateDto, record, ...args);
  }
}
