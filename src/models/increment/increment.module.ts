import { forwardRef, Module } from '@nestjs/common';
import { IncrementService } from './increment.service';
import { IncrementController } from './increment.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Increment } from './increment.entity';
import { TenantModule } from '../tenant/tenant.module';
import { PhaseModule } from '../phase/phase.module';
import { ProjectModule } from '../project/project.module';
import { IssueModule } from '../issue/issue.module';

@Module({
  controllers: [IncrementController],
  providers: [IncrementService],
  // TypeOrmModule.forFeature() allows to import Modules with circular dependencies
  imports: [
    TypeOrmModule.forFeature([Increment]),
    forwardRef(() => TenantModule),
    forwardRef(() => ProjectModule),
    forwardRef(() => PhaseModule),
    forwardRef(() => IssueModule),
  ],
  exports: [IncrementService],
})
export class IncrementModule {}
