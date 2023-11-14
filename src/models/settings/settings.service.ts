import { Injectable } from '@nestjs/common';
import { SettingsEntity } from './settings.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingsDto } from './settings.dto';
import { BaseService } from '../../common/base.service';

@Injectable()
export class SettingsService extends BaseService<SettingsEntity, SettingsDto> {
  constructor(
    @InjectRepository(SettingsEntity)
    public repository: Repository<SettingsEntity>,
  ) {
    super();
  }
}
