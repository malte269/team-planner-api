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
import { Request, Response } from 'express';
import { ApiResponses } from '../../common/decorators/ApiResponses.decorator';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserToken } from '../../common/decorators/user.decorator';
import { useDefaultValue } from '../../helper/helper-functions';
import { QueryParams } from '../../helper/Typings';
import { Slot } from './slot.entity';
import SlotDto from './slot.dto';
import { SlotService } from './slot.service';
import { User } from '../user/user.entity';
import {
  SLOT_ERROR_CREATE,
  SLOT_ERROR_DELETE,
  SLOT_ERROR_UPDATE,
} from './slot.enums';
import { BaseControllerWithTenant } from '../../common/with-tenant/with-tenant.controller';
import { TenantService } from '../tenant/tenant.service';

@Controller('slot')
@ApiTags('Slot')
export class SlotController extends BaseControllerWithTenant<Slot, SlotDto> {
  constructor(
    service: SlotService,
    protected readonly tenantService: TenantService,
  ) {
    super(service, tenantService, Slot);
  }

  @Post()
  @ApiResponses(SLOT_ERROR_CREATE)
  async create(
    @Req() req: Request,
    @Res() res: Response,
    @UserToken() user: User,
    @Body() body: SlotDto,
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
  async findAll(@Query() query: QueryParams<Slot>, @UserToken() user: User) {
    useDefaultValue(query, 'deleted', false);
    this.parseStringBooleanQuery(query, ['deleted']);

    return await this.getRecords(user, query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @UserToken() user: User) {
    return this.getRecord(id, user, this.possibleRelations());
  }

  @Patch(':id')
  @ApiResponses(SLOT_ERROR_UPDATE)
  async update(
    @Req() req: Request,
    @Res() res: Response,
    @UserToken() user: User,
    @Param('id') id: string,
    @Body() body: SlotDto,
  ) {
    const record = await this.getRecord(id, user);

    await this.service.update(id, user, body, record);

    return super.update(req, res, user, id, body);
  }

  @Delete(':id')
  @ApiResponses(SLOT_ERROR_DELETE)
  async remove(@Param('id') id: string, @UserToken() user: User) {
    const record = await this.getRecord(id, user);
    return this.service.updateForRemove(id, user, record);
  }
}
