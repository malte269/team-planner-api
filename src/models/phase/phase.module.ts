import { forwardRef, Module } from '@nestjs/common';
import { PhaseService } from './phase.service';
import { PhaseController } from './phase.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Phase } from './phase.entity';
import { ProjectModule } from '../project/project.module';
import { TenantModule } from '../tenant/tenant.module';
import { IncrementModule } from '../increment/increment.module';
import { GroupModule } from '../group/group.module';

@Module({
  controllers: [PhaseController],
  providers: [PhaseService],
  // TypeOrmModule.forFeature() allows to import Modules with circular dependencies
  imports: [
    TypeOrmModule.forFeature([Phase]),
    forwardRef(() => TenantModule),
    forwardRef(() => ProjectModule),
    forwardRef(() => IncrementModule),
    forwardRef(() => GroupModule),
  ],
  exports: [PhaseService],
})
export class PhaseModule {}
