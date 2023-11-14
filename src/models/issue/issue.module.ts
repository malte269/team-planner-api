import { forwardRef, Module } from '@nestjs/common';
import { IssueService } from './issue.service';
import { IssueController } from './issue.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Issue } from './issue.entity';
import { ProjectModule } from '../project/project.module';
import { UserModule } from '../user/user.module';
import { GroupModule } from '../group/group.module';
import { PhaseModule } from '../phase/phase.module';
import { IncrementModule } from '../increment/increment.module';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  controllers: [IssueController],
  providers: [IssueService],
  // TypeOrmModule.forFeature() allows to import Modules with circular dependencies
  imports: [
    TypeOrmModule.forFeature([Issue]),
    forwardRef(() => TenantModule),
    forwardRef(() => ProjectModule),
    forwardRef(() => UserModule),
    forwardRef(() => GroupModule),
    forwardRef(() => PhaseModule),
    forwardRef(() => IncrementModule),
  ],
  exports: [IssueService],
})
export class IssueModule {}
