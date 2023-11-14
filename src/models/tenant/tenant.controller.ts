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
import { TenantService } from './tenant.service';
import { TenantDto } from './tenant.dto';
import { Request, Response } from 'express';
import { BaseController } from '../../common/base.controller';
import { Tenant } from './tenant.entity';
import { ApiResponses } from '../../common/decorators/ApiResponses.decorator';
import {
  TENANT_ERROR_CREATE,
  TENANT_ERROR_DELETE,
  TENANT_ERROR_UPDATE,
} from './tenant.enums';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserToken } from '../../common/decorators/user.decorator';
import { useDefaultValue } from '../../helper/helper-functions';
import { User } from '../user/user.entity';
import { QueryParams } from '../../helper/Typings';
import { SettingsService } from '../settings/settings.service';

@Controller('tenant')
@ApiTags('Tenant')
export class TenantController extends BaseController<Tenant, TenantDto> {
  constructor(
    service: TenantService,
    private readonly settingsService: SettingsService,
  ) {
    super(service, Tenant);
  }

  @Post()
  @ApiResponses(TENANT_ERROR_CREATE)
  async create(
    @Req() req: Request,
    @Res() res: Response,
    @UserToken() user: User,
    @Body() body: TenantDto,
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
  @ApiQuery({ name: 'name', type: 'string', required: false })
  async findAll(@Query() query: QueryParams<Tenant>, @UserToken() user: User) {
    useDefaultValue(query, 'deleted', false);
    this.parseStringBooleanQuery(query, ['deleted']);

    return await this.getRecords(user, query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @UserToken() user: User) {
    return this.getRecord(id, user, this.possibleRelations());
  }

  @Patch(':id')
  @ApiResponses(TENANT_ERROR_UPDATE)
  async update(
    @Req() req: Request,
    @Res() res: Response,
    @UserToken() user: User,
    @Param('id') id: string,
    @Body() body: TenantDto,
  ) {
    const record = await this.getRecord(id, user);

    await this.service.update(id, user, body, record);

    return super.update(req, res, user, id, body);
  }

  @Delete(':id')
  @ApiResponses(TENANT_ERROR_DELETE)
  async remove(@Param('id') id: string, @UserToken() user: User) {
    const record = await this.getRecord(id, user);
    return this.service.updateForRemove(id, user, record);
  }

  protected possibleRelations(user?: User) {
    return super.possibleRelations(user).concat({
      property: 'settings',
      serviceOrQuery: this.settingsService,
    });
  }
}
