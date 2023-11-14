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
import { GroupService } from './group.service';
import { GroupDto } from './group.dto';
import { Request, Response } from 'express';
import { Relation } from '../../common/base.controller';
import { Group } from './group.entity';
import { ApiResponses } from '../../common/decorators/ApiResponses.decorator';
import {
  MODULE_ERROR_CREATE,
  MODULE_ERROR_DELETE,
  MODULE_ERROR_UPDATE,
} from './group.enums';
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
import { IssueService } from '../issue/issue.service';
import { BaseControllerWithTenant } from '../../common/with-tenant/with-tenant.controller';
import { TenantService } from '../tenant/tenant.service';
import {
  initFamilyHierarchy,
  initInverseFamilyHierarchy,
} from '../../common/interfaces/family.interface';

@Controller('group')
@ApiTags('Group')
export class GroupController extends BaseControllerWithTenant<Group, GroupDto> {
  constructor(
    service: GroupService,
    readonly tenantService: TenantService,
    private readonly projectService: ProjectService,
    private readonly issueService: IssueService,
  ) {
    super(service, tenantService, Group);
  }

  @Post()
  @ApiResponses(MODULE_ERROR_CREATE)
  async create(
    @Req() req: Request,
    @Res() res: Response,
    @UserToken() user: User,
    @Body() body: GroupDto,
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
  @ApiQuery({ name: key<Group>('name'), type: 'string', required: false })
  @ApiQuery({ name: key<Group>('projectId'), type: 'string', required: false })
  @ApiQuery({ name: 'inverse', type: 'boolean', required: false })
  @ApiQuery({ name: 'family', type: 'boolean', required: false })
  async findAll(
    @Query()
    query: QueryParams<Group> & {
      inverse: boolean | string;
      family: boolean | string;
    },
    @UserToken() user: User,
  ) {
    useDefaultValue(query, 'deleted', false);
    this.parseStringBooleanQuery(query, ['deleted', 'family', 'inverse']);
    applyDefaultQueryValues(query, 'sort', ['name+ASC']);
    const inverse = query.inverse;
    const family = query.family;
    delete query.inverse;
    delete query.family;
    const records = await this.getRecords(user, query);
    if (family) {
      if (inverse) {
        records.records = initInverseFamilyHierarchy(records.records);
      } else {
        records.records = initFamilyHierarchy(records.records);
      }
    }
    return records;
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @UserToken() user: User) {
    return this.getRecord(id, user, this.possibleRelations());
  }

  @Patch(':id')
  @ApiResponses(MODULE_ERROR_UPDATE)
  async update(
    @Req() req: Request,
    @Res() res: Response,
    @UserToken() user: User,
    @Param('id') id: string,
    @Body() body: GroupDto,
  ) {
    const record = await this.getRecord(id, user, []);

    await this.service.update(id, user, body, record);

    return super.update(req, res, user, id, body);
  }

  @Delete(':id')
  @ApiResponses(MODULE_ERROR_DELETE)
  async remove(@Param('id') id: string, @UserToken() user: User) {
    const record = await this.getRecord(id, user);
    return this.service.updateForRemove(id, user, record);
  }

  protected possibleRelations(): Relation<Group>[] {
    return super.possibleRelations().concat([
      {
        property: 'project',
        serviceOrQuery: this.projectService,
      },
      {
        property: 'parent',
        serviceOrQuery: this.service,
      },
      {
        property: 'children',
        serviceOrQuery: this.service,
      },
      {
        property: 'issues',
        serviceOrQuery: this.issueService,
      },
    ]);
  }
}
