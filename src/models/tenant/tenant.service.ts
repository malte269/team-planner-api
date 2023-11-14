import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Tenant } from './tenant.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { TenantDto } from './tenant.dto';
import { BaseService } from '../../common/base.service';
import { User } from '../user/user.entity';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class TenantService extends BaseService<Tenant, TenantDto> {
  constructor(
    @InjectRepository(Tenant) public repository: Repository<Tenant>,
    @Inject(forwardRef(() => SettingsService))
    private readonly settingsService: SettingsService,
  ) {
    super('TenS');
  }

  protected async afterInsert(
    record: Tenant,
    createDto: TenantDto,
    user: User,
    ...args
  ): Promise<Tenant> {
    const { id } = await this.settingsService.create(
      createDto.settings ?? {},
      user,
    );
    await this.update(
      record.id,
      user,
      {
        settingsId: id,
      },
      record,
    );
    return super.afterInsert(record, createDto, user, ...args);
  }

  async beforeUpdate(
    id: string,
    user: User,
    updateDto: Partial<TenantDto>,
    record: Tenant,
    ...args
  ): Promise<Partial<TenantDto>> {
    if (updateDto.settings) {
      // if new settings object, create
      if (!record.settingsId) {
        const settings = await this.settingsService.create(
          updateDto.settings,
          user,
        );
        updateDto.settingsId = settings.id;
      } else {
        // if record already has a settings object, update it
        await this.settingsService.update(
          record.settingsId,
          user,
          updateDto.settings,
        );
      }
      delete updateDto.settings;
    }
    return super.beforeUpdate(id, user, updateDto, record, ...args);
  }

  createQueryBuilder(user: User, alias?: string): SelectQueryBuilder<Tenant> {
    const query = super.createQueryBuilder(user, alias);
    // if not a global user, add the tenantId check
    if (user.tenantId) {
      query.andWhere(`${query.alias}.id = :${this.short}TenantId`, {
        [`${this.short}TenantId`]: user.tenantId,
      });
    }
    return query;
  }
}
