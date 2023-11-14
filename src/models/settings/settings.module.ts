import { forwardRef, Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectModule } from '../project/project.module';
import { TenantModule } from '../tenant/tenant.module';
import { SettingsEntity } from './settings.entity';

@Module({
  controllers: [],
  providers: [SettingsService],
  // TypeOrmModule.forFeature() allows to import Modules with circular dependencies
  imports: [
    TypeOrmModule.forFeature([SettingsEntity]),
    forwardRef(() => TenantModule),
    forwardRef(() => ProjectModule),
  ],
  exports: [SettingsService],
})
export class SettingsModule {}
