import { forwardRef, Module } from '@nestjs/common';
import { GroupService } from './group.service';
import { GroupController } from './group.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group as ModuleEntity } from './group.entity';
import { ProjectModule } from '../project/project.module';
import { IssueModule } from '../issue/issue.module';
import { PhaseModule } from '../phase/phase.module';
import { IncrementModule } from '../increment/increment.module';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  controllers: [GroupController],
  providers: [GroupService],
  // TypeOrmModule.forFeature() allows to import Modules with circular dependencies
  imports: [
    TypeOrmModule.forFeature([ModuleEntity]),
    forwardRef(() => TenantModule),
    forwardRef(() => ProjectModule),
    forwardRef(() => IncrementModule),
    forwardRef(() => PhaseModule),
    forwardRef(() => IssueModule),
  ],
  exports: [GroupService],
})
export class GroupModule {}
