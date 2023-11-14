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
import { PhaseService } from './phase.service';
import { PhaseDto } from './phase.dto';
import { Request, Response } from 'express';
import { Relation } from '../../common/base.controller';
import { Phase } from './phase.entity';
import { ApiResponses } from '../../common/decorators/ApiResponses.decorator';
import {
  PHASE_ERROR_CREATE,
  PHASE_ERROR_DELETE,
  PHASE_ERROR_UPDATE,
} from './phase.enums';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserToken } from '../../common/decorators/user.decorator';
import { useDefaultValue } from '../../helper/helper-functions';
import { User } from '../user/user.entity';
import { key } from '../../common/base.entity';
import { QueryParams } from '../../helper/Typings';
import { ProjectService } from '../project/project.service';
import { BaseControllerWithTenant } from '../../common/with-tenant/with-tenant.controller';
import { TenantService } from '../tenant/tenant.service';

@Controller('phase')
@ApiTags('Phase')
export class PhaseController extends BaseControllerWithTenant<Phase, PhaseDto> {
  constructor(
    service: PhaseService,
    readonly tenantService: TenantService,
    private readonly projectService: ProjectService,
  ) {
    super(service, tenantService, Phase);
  }

  @Post()
  @ApiResponses(PHASE_ERROR_CREATE)
  async create(
    @Req() req: Request,
    @Res() res: Response,
    @UserToken() user: User,
    @Body() body: PhaseDto,
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
  @ApiQuery({ name: key<Phase>('name'), type: 'string', required: false })
  async findAll(@Query() query: QueryParams<Phase>, @UserToken() user: User) {
    useDefaultValue(query, 'deleted', false);
    this.parseStringBooleanQuery(query, ['deleted']);

    return this.getRecords(user, query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @UserToken() user: User) {
    return this.getRecord(id, user, this.possibleRelations());
  }

  @Patch(':id')
  @ApiResponses(PHASE_ERROR_UPDATE)
  async update(
    @Req() req: Request,
    @Res() res: Response,
    @UserToken() user: User,
    @Param('id') id: string,
    @Body() body: PhaseDto,
  ) {
    const record = await this.getRecord(id, user, []);

    await this.service.update(id, user, body, record);

    return super.update(req, res, user, id, body);
  }

  @Delete(':id')
  @ApiResponses(PHASE_ERROR_DELETE)
  async remove(@Param('id') id: string, @UserToken() user: User) {
    const record = await this.getRecord(id, user);
    return this.service.updateForRemove(id, user, record);
  }

  protected possibleRelations(): Relation<Phase>[] {
    return super.possibleRelations().concat([
      {
        property: 'project',
        serviceOrQuery: this.projectService,
      },
    ]);
  }
}
