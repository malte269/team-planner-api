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
import { IncrementService } from './increment.service';
import { IncrementDto } from './increment.dto';
import { Request, Response } from 'express';
import { Relation } from '../../common/base.controller';
import { Increment } from './increment.entity';
import { ApiResponses } from '../../common/decorators/ApiResponses.decorator';
import {
  INCREMENT_ERROR_CREATE,
  INCREMENT_ERROR_DELETE,
  INCREMENT_ERROR_UPDATE,
} from './increment.enums';
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
import { BaseControllerWithTenant } from '../../common/with-tenant/with-tenant.controller';
import { TenantService } from '../tenant/tenant.service';
import { IssueService } from '../issue/issue.service';
import { Issue } from '../issue/issue.entity';
import { PhaseService } from '../phase/phase.service';
import { Phase } from '../phase/phase.entity';

@Controller('increment')
@ApiTags('Increment')
export class IncrementController extends BaseControllerWithTenant<
  Increment,
  IncrementDto
> {
  constructor(
    service: IncrementService,
    readonly tenantService: TenantService,
    private readonly projectService: ProjectService,
    private readonly issueService: IssueService,
    private readonly phaseService: PhaseService,
  ) {
    super(service, tenantService, Increment);
  }

  @Post()
  @ApiResponses(INCREMENT_ERROR_CREATE)
  async create(
    @Req() req: Request,
    @Res() res: Response,
    @UserToken() user: User,
    @Body() body: IncrementDto,
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
  @ApiQuery({ name: key<Increment>('name'), type: 'string', required: false })
  async findAll(
    @Query() query: QueryParams<Increment>,
    @UserToken() user: User,
  ) {
    useDefaultValue(query, 'deleted', false);
    this.parseStringBooleanQuery(query, ['deleted']);
    applyDefaultQueryValues(query, 'sort', [
      key<Increment>('incrementNumber') + '+ASC',
      `${key<Increment>('phases')}.${key<Phase>('order')}+ASC`,
      `${key<Increment>('issues')}.${key<Issue>('identifier')}+ASC`,
    ]);
    applyDefaultQueryValues(query, 'populate', ['issues', 'phases']);
    return this.getRecords(user, query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @UserToken() user: User) {
    return this.getRecord(id, user, this.possibleRelations(), undefined, [
      key<Increment>('incrementNumber') + '+ASC',
      `${key<Increment>('phases')}.${key<Phase>('order')}+ASC`,
      `${key<Increment>('issues')}.${key<Issue>('identifier')}+ASC`,
    ]);
  }

  @Patch(':id')
  @ApiResponses(INCREMENT_ERROR_UPDATE)
  async update(
    @Req() req: Request,
    @Res() res: Response,
    @UserToken() user: User,
    @Param('id') id: string,
    @Body() body: IncrementDto,
  ) {
    const record = await this.getRecord(id, user, []);

    await this.service.update(id, user, body, record);

    return super.update(req, res, user, id, body);
  }

  @Delete(':id')
  @ApiResponses(INCREMENT_ERROR_DELETE)
  async remove(@Param('id') id: string, @UserToken() user: User) {
    const record = await this.getRecord(id, user);
    return this.service.updateForRemove(id, user, record);
  }

  protected possibleRelations(): Relation<Increment>[] {
    return super.possibleRelations().concat([
      {
        property: 'project',
        serviceOrQuery: this.projectService,
      },
      {
        property: 'issues',
        serviceOrQuery: this.issueService,
      },
      {
        property: 'phases',
        serviceOrQuery: this.phaseService,
      },
    ]);
  }
}
