import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { SkillService } from './skill.service';
import { SkillDto } from './skill.dto';
import { Request, Response } from 'express';
import { Skill } from './skill.entity';
import { ApiResponses } from '../../common/decorators/ApiResponses.decorator';
import { SKILL_ERROR_CREATE } from './skill.enums';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserToken } from '../../common/decorators/user.decorator';
import { useDefaultValue } from '../../helper/helper-functions';
import { key } from '../../common/base.entity';
import { User } from '../user/user.entity';
import { QueryParams } from '../../helper/Typings';
import { BaseControllerWithTenant } from '../../common/with-tenant/with-tenant.controller';
import { TenantService } from '../tenant/tenant.service';

@Controller('skill')
@ApiTags('Skill')
export class SkillController extends BaseControllerWithTenant<Skill, SkillDto> {
  constructor(service: SkillService, readonly tenantService: TenantService) {
    super(service, tenantService, Skill);
  }

  @Post()
  @ApiResponses(SKILL_ERROR_CREATE)
  async create(
    @Req() req: Request,
    @Res() res: Response,
    @UserToken() user: User,
    @Body() body: SkillDto,
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
  @ApiQuery({ name: key<Skill>('name'), type: 'string', required: false })
  async findAll(@Query() query: QueryParams<Skill>, @UserToken() user: User) {
    useDefaultValue(query, 'deleted', false);
    this.parseStringBooleanQuery(query, ['deleted']);

    return this.getRecords(user, query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @UserToken() user: User) {
    return this.getRecord(id, user, this.possibleRelations());
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @UserToken() user: User) {
    const record = await this.getRecord(id, user);
    return this.service.remove(id, user, record);
  }
}
