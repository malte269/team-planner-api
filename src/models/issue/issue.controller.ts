import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { IssueService } from './issue.service';
import { IssueDto } from './issue.dto';
import { Request, Response } from 'express';
import { Relation } from '../../common/base.controller';
import { Issue, IssueType } from './issue.entity';
import { ApiResponses } from '../../common/decorators/ApiResponses.decorator';
import {
  ISSUE_ERROR_CREATE,
  ISSUE_ERROR_DELETE,
  ISSUE_ERROR_UPDATE,
} from './issue.enums';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserToken } from '../../common/decorators/user.decorator';
import {
  applyDefaultQueryValues,
  useDefaultValue,
} from '../../helper/helper-functions';
import { User } from '../user/user.entity';
import { key } from '../../common/base.entity';
import { QueryParams } from '../../helper/Typings';
import { ProjectService } from '../project/project.service';
import { UserService } from '../user/user.service';
import { GroupService } from '../group/group.service';
import { PhaseService } from '../phase/phase.service';
import { IncrementService } from '../increment/increment.service';
import { BaseControllerWithTenant } from '../../common/with-tenant/with-tenant.controller';
import { TenantService } from '../tenant/tenant.service';
import { initFamilyHierarchy } from '../../common/interfaces/family.interface';
import { initTimeline } from '../../common/interfaces/timeline.interface';
import { RES_ERROR_GENERIC, ResException } from '../../common/ResException';

export enum IssueGroup {
  FAMILY = 'family',
  MODULE = 'module',
  INCREMENT = 'increment',
  TIMELINE = 'timeline',
}

@Controller('issue')
@ApiTags('Issue')
export class IssueController extends BaseControllerWithTenant<Issue, IssueDto> {
  constructor(
    service: IssueService,
    readonly tenantService: TenantService,
    readonly projectService: ProjectService,
    readonly userService: UserService,
    readonly moduleService: GroupService,
    readonly phaseService: PhaseService,
    readonly incrementService: IncrementService,
  ) {
    super(service, tenantService, Issue);
  }

  @Post()
  @ApiResponses(ISSUE_ERROR_CREATE)
  async create(
    @Req() req: Request,
    @Res() res: Response,
    @UserToken() user: User,
    @Body() body: IssueDto,
  ) {
    const record = await this.service.create(body, user);
    return super.create(req, res, user, body, record.id);
  }

  @Get()
  @ApiQuery({ name: 'skip', type: 'number', required: false })
  @ApiQuery({ name: 'limit', type: 'number', required: false })
  @ApiQuery({
    name: 'sort',
    type: 'string',
    required: false,
    example: 'createdAt+DESC',
  })
  @ApiQuery({
    name: 'populate',
    type: 'string',
    isArray: true,
    required: false,
  })
  @ApiQuery({ name: key<Issue>('projectId'), type: 'string', required: false })
  @ApiQuery({ name: key<Issue>('name'), type: 'string', required: false })
  @ApiQuery({
    name: key<Issue>('type'),
    type: 'enum',
    required: false,
    enum: IssueType,
    example: IssueType.TASK,
  })
  @ApiQuery({
    name: 'groupBy',
    type: 'enum',
    required: false,
    enum: IssueGroup,
  })
  async findAll(
    @Query()
    query: QueryParams<Issue> & {
      groupBy?: IssueGroup;
    },
    @UserToken() user: User,
    @Query('groupBy') groupBy: IssueGroup,
  ) {
    if (query.incrementId && query.incrementId === 'null') {
      query.incrementId = null;
    }
    delete query.groupBy;
    useDefaultValue(query, 'deleted', false);
    this.parseStringBooleanQuery(query, ['deleted']);
    if (groupBy === 'timeline') {
      applyDefaultQueryValues(query, 'populate', ['previous']);
    }

    const issues = await this.getRecords(user, query);
    switch (groupBy) {
      case IssueGroup.FAMILY:
        issues.records = initFamilyHierarchy(issues.records);
        break;
      case IssueGroup.TIMELINE:
        issues.records = initTimeline(issues.records);
        break;
    }

    return issues;
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @UserToken() user: User) {
    const queryBuilder = this.service.createQueryBuilder(user);
    queryBuilder.andWhere(
      `(${queryBuilder.alias}.id = :id OR ${queryBuilder.alias}.${key<Issue>(
        'identifier',
      )} = :identifier)`,
      {
        id,
        identifier: id,
      },
    );

    this.service.addLeftJoinAndSelect(
      this.possibleRelations(),
      queryBuilder,
      user,
    );

    this.parseSortQueryBuilder(queryBuilder, [
      `${key<Issue>('children')}.name`,
    ]);

    const record = await queryBuilder.getOne();
    if (!record) {
      throw new ResException(RES_ERROR_GENERIC.NOT_FOUND);
    }
    return record;
  }

  @Patch(':id')
  @ApiResponses(ISSUE_ERROR_UPDATE)
  async update(
    @Req() req: Request,
    @Res() res: Response,
    @UserToken() user: User,
    @Param('id') id: string,
    @Body() body: IssueDto,
  ) {
    const record = await this.getRecord(id, user, []);

    await this.service.update(id, user, body, record);

    return super.update(req, res, user, id, body);
  }

  @Delete(':id')
  @ApiResponses(ISSUE_ERROR_DELETE)
  async remove(@Param('id') id: string, @UserToken() user: User) {
    const record = await this.getRecord(id, user);
    return this.service.updateForRemove(id, user, record);
  }

  protected possibleRelations(): Relation<Issue>[] {
    return super.possibleRelations().concat([
      {
        property: 'project',
        serviceOrQuery: this.projectService,
      },
      {
        property: 'user',
        serviceOrQuery: this.userService,
      },
      {
        property: 'group',
        serviceOrQuery: this.moduleService,
      },
      {
        property: 'phase',
        serviceOrQuery: this.phaseService,
      },
      {
        property: 'increment',
        serviceOrQuery: this.incrementService,
      },
      {
        property: 'previous',
        serviceOrQuery: this.service,
      },
      {
        property: 'following',
        serviceOrQuery: this.service,
      },
      {
        property: 'children',
        serviceOrQuery: this.service,
      },
      {
        property: 'parent',
        serviceOrQuery: this.service,
      },
    ]);
  }
}
