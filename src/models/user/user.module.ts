import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { WorkTimeModule } from '../work-time/workTime.module';
import { ProjectModule } from '../project/project.module';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  controllers: [UserController],
  providers: [UserService],
  // TypeOrmModule.forFeature() allows to import Modules with circular dependencies
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => TenantModule),
    forwardRef(() => ProjectModule),
    forwardRef(() => WorkTimeModule),
  ],
  exports: [UserService],
})
export class UserModule {}
