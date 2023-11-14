import { forwardRef, Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './project.entity';
import { UserModule } from '../user/user.module';
import { IssueModule } from '../issue/issue.module';
import { TenantModule } from '../tenant/tenant.module';
import { PhaseModule } from '../phase/phase.module';
import { IncrementModule } from '../increment/increment.module';
import { WorkTimeModule } from '../work-time/workTime.module';
import { SlotModule } from '../slot/slot.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  controllers: [ProjectController],
  providers: [ProjectService],
  // TypeOrmModule.forFeature() allows to import Modules with circular dependencies
  imports: [
    TypeOrmModule.forFeature([Project]),
    forwardRef(() => TenantModule),
    forwardRef(() => UserModule),
    forwardRef(() => IssueModule),
    forwardRef(() => PhaseModule),
    forwardRef(() => IncrementModule),
    forwardRef(() => WorkTimeModule),
    forwardRef(() => SlotModule),
    forwardRef(() => SettingsModule),
  ],
  exports: [ProjectService],
})
export class ProjectModule {}
