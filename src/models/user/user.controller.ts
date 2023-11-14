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
import { UserService } from './user.service';
import { UserDto } from './user.dto';
import { Request, Response } from 'express';
import { Relation } from '../../common/base.controller';
import { User } from './user.entity';
import { ApiResponses } from '../../common/decorators/ApiResponses.decorator';
import {
  USER_ERROR_CREATE,
  USER_ERROR_DELETE,
  USER_ERROR_UPDATE,
} from './user.enums';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserToken } from '../../common/decorators/user.decorator';
import {
  applyDefaultQueryValues,
  useDefaultValue,
} from '../../helper/helper-functions';
import { WorkTimeService } from '../work-time/workTime.service';
import { key } from '../../common/base.entity';
import { WorkTime } from '../work-time/workTime.entity';
import { QueryParams } from '../../helper/Typings';
import { TenantService } from '../tenant/tenant.service';
import { BaseControllerWithTenant } from '../../common/with-tenant/with-tenant.controller';

@Controller('user')
@ApiTags('User')
export class UserController extends BaseControllerWithTenant<User, UserDto> {
  constructor(
    service: UserService,
    readonly tenantService: TenantService,
    private readonly workTimeService: WorkTimeService,
  ) {
    super(service, tenantService, User);
  }

  @Post()
  @ApiResponses(USER_ERROR_CREATE)
  async create(
    @Req() req: Request,
    @Res() res: Response,
    @UserToken() user: User,
    @Body() body: UserDto,
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
  @ApiQuery({ name: 'email', type: 'string', required: false })
  @ApiQuery({ name: 'firstName', type: 'string', required: false })
  @ApiQuery({ name: 'lastName', type: 'string', required: false })
  @ApiQuery({ name: 'skills', isArray: true, type: 'string', required: false })
  async findAll(@Query() query: QueryParams<User>, @UserToken() user: User) {
    useDefaultValue(query, 'deleted', false);
    this.parseStringBooleanQuery(query, ['deleted']);

    applyDefaultQueryValues(query, 'populate', ['workTimes']);
    applyDefaultQueryValues(query, 'sort', [
      `${key<User>('workTimes')}.${key<WorkTime>('validFrom')}+ASC`,
    ]);

    return await this.getRecords(user, query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @UserToken() user: User) {
    if (id === 'me') {
      id = user.id;
    }
    const record = await this.getRecord(
      id,
      user,
      this.possibleRelations(),
      undefined,
      [`${key<User>('workTimes')}.${key<WorkTime>('validFrom')}+ASC`],
    );
    delete record.password;
    return record;
  }

  @Patch(':id')
  @ApiResponses(USER_ERROR_UPDATE)
  async update(
    @Req() req: Request,
    @Res() res: Response,
    @UserToken() user: User,
    @Param('id') id: string,
    @Body() body: UserDto,
  ) {
    const record = await this.getRecord(id, user);

    await this.service.update(id, user, body, record);

    return super.update(req, res, user, id, body);
  }

  @Delete(':id')
  @ApiResponses(USER_ERROR_DELETE)
  async remove(@Param('id') id: string, @UserToken() user: User) {
    const record = await this.getRecord(id, user);
    return this.service.updateForRemove(id, user, record);
  }

  protected possibleRelations(): Relation<User>[] {
    return super.possibleRelations().concat({
      property: 'workTimes',
      serviceOrQuery: this.workTimeService,
    });
  }
}
