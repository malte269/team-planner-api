import { forwardRef, Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './tenant.entity';
import { ProjectModule } from '../project/project.module';
import { UserModule } from '../user/user.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  controllers: [TenantController],
  providers: [TenantService],
  // TypeOrmModule.forFeature() allows to import Modules with circular dependencies
  imports: [
    TypeOrmModule.forFeature([Tenant]),
    forwardRef(() => UserModule),
    forwardRef(() => SettingsModule),
    forwardRef(() => ProjectModule),
  ],
  exports: [TenantService],
})
export class TenantModule {}
