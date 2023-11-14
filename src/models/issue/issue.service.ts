import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Issue } from './issue.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { IssueDto } from './issue.dto';
import { User } from '../user/user.entity';
import { BaseServiceWithTenant } from '../../common/with-tenant/with-tenant.service';
import { ResException } from '../../common/ResException';
import { ISSUE_ERROR_CREATE, ISSUE_ERROR_UPDATE } from './issue.enums';
import {
  DurationUnit,
  extractPaths,
  initTimeline,
  Path,
  saveTimelineRelation,
} from '../../common/interfaces/timeline.interface';
import { GroupService } from '../group/group.service';
import { key } from '../../common/base.entity';
import { Group } from '../group/group.entity';
import { ErrorCollectionItem } from '../../common/decorators/ApiResponses.decorator';
import { IncrementService } from '../increment/increment.service';
import { Increment } from '../increment/increment.entity';
import { ProjectService } from '../project/project.service';

@Injectable()
export class IssueService extends BaseServiceWithTenant<Issue, IssueDto> {
  constructor(
    @InjectRepository(Issue) public repository: Repository<Issue>,
    @Inject(forwardRef(() => GroupService))
    private readonly groupService: GroupService,
    @Inject(forwardRef(() => IncrementService))
    private readonly incrementService: IncrementService,
    @Inject(forwardRef(() => ProjectService))
    private readonly projectService: ProjectService,
  ) {
    super('Is');
  }

  async beforeInsert(createDto: IssueDto, user: User): Promise<IssueDto> {
    if (!createDto.projectId) {
      throw new ResException(ISSUE_ERROR_CREATE.MISSING_PROJECT);
    }
    // if duration is set
    if (createDto.duration !== undefined && createDto.duration !== null) {
      // check for invalid duration
      if (+createDto.duration === 0 || isNaN(+createDto.duration)) {
        throw new ResException(ISSUE_ERROR_CREATE.INVALID_DURATION);
      }
    }
    if (
      !createDto.unit ||
      !Object.values(DurationUnit).includes(createDto.unit)
    ) {
      throw new ResException(ISSUE_ERROR_CREATE.INVALID_DURATION);
    }

    if (createDto.incrementId) {
      await this.checkForIncrement(
        user,
        createDto.projectId,
        createDto.incrementId,
        ISSUE_ERROR_CREATE,
      );
    }

    if (createDto.groupId) {
      await this.checkForGroup(
        user,
        createDto.projectId,
        createDto.groupId,
        ISSUE_ERROR_CREATE,
      );
    }

    if (!createDto.identifier) {
      const [count, project] = await Promise.all([
        this.count({
          projectId: createDto.projectId,
        }),
        this.projectService.findOne({
          where: {
            id: createDto.projectId,
          },
          select: {
            id: true,
            short: true,
          },
        }),
      ]);
      createDto.identifier = project.short + `-${count + 1}`;
    }

    return super.beforeInsert(createDto, user);
  }

  protected async afterInsert(
    record: Issue,
    createDto: IssueDto,
    user: User,
    ...args: any[]
  ): Promise<Issue> {
    await saveTimelineRelation(this, record.id, createDto);
    return super.afterInsert(record, createDto, user, ...args);
  }

  async beforeUpdate(
    id: string,
    user: User,
    updateDto: Partial<IssueDto>,
    record: Issue,
    ...args: any[]
  ): Promise<Partial<IssueDto>> {
    await saveTimelineRelation(this, id, updateDto);
    if (updateDto.incrementId && updateDto.incrementId !== record.incrementId) {
      await this.checkForIncrement(
        user,
        record.projectId,
        updateDto.incrementId,
        ISSUE_ERROR_UPDATE,
      );
    }
    if (updateDto.groupId && updateDto.groupId !== record.groupId) {
      await this.checkForGroup(
        user,
        record.projectId,
        updateDto.groupId,
        ISSUE_ERROR_UPDATE,
      );
    }

    // these would overwrite the new ids
    delete updateDto.phase;
    delete updateDto.increment;
    delete updateDto.group;
    // these would cause an error on save
    delete updateDto.children;
    delete updateDto.following;
    return super.beforeUpdate(id, user, updateDto, record, ...args);
  }

  async checkForGroup(
    user: User,
    projectId: string,
    groupId: string,
    errorCollection: {
      [key in 'GROUP_NOT_FOUND']: ErrorCollectionItem;
    },
  ) {
    const groupQuery = this.groupService
      .createQueryBuilder(user)
      .andWhereInIds(groupId);
    const group = await groupQuery
      .andWhere(`${groupQuery.alias}.${key<Group>('projectId')} = :projectId`, {
        projectId,
      })
      .getOne();

    // group was not found or no access
    if (!group) {
      throw new ResException(errorCollection['GROUP_NOT_FOUND']);
    }
  }

  async checkForIncrement(
    user: User,
    projectId: string,
    incrementId: string,
    errorCollection: {
      [key in 'INCREMENT_NOT_FOUND']: ErrorCollectionItem;
    },
  ) {
    const query = this.incrementService
      .createQueryBuilder(user)
      .andWhereInIds(incrementId);
    const increment = await query
      .andWhere(`${query.alias}.${key<Increment>('projectId')} = :projectId`, {
        projectId,
      })
      .getOne();
    if (!increment) {
      throw new ResException(errorCollection.INCREMENT_NOT_FOUND);
    }
  }

  public calculateCriticalPath(issues: Issue[]): Path {
    const timeline = initTimeline(issues);
    const paths = timeline.map((issue) => extractPaths(issue)).flat();
    let longestPath: Path = { path: [], duration: 0 };
    paths.forEach((path) => {
      if (
        // if new duration is longer
        longestPath.duration < path.duration ||
        // or if the durations are same
        (longestPath.duration === path.duration &&
          // but the new path is longer
          longestPath.path.length < path.path.length)
      ) {
        // accept new path
        longestPath = path;
      }
    });
    return longestPath;
  }

  parseWhereProperty(
    queryBuilder: SelectQueryBuilder<Issue>,
    propKey: string,
    propValue: any,
  ): boolean {
    if (propKey === key<Issue>('type')) {
      queryBuilder.andWhere(
        `${queryBuilder.alias}.${propKey} IN (:${this.short}Type)`,
        { [`${this.short}Type`]: (propValue as string).split(',') },
      );
      return true;
    }
    return super.parseWhereProperty(queryBuilder, propKey, propValue);
  }
}
