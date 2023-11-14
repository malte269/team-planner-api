import { forwardRef, Module } from '@nestjs/common';
import { SkillService } from './skill.service';
import { SkillController } from './skill.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Skill } from './skill.entity';
import { TenantModule } from '../tenant/tenant.module';
import { UserModule } from '../user/user.module';

@Module({
  controllers: [SkillController],
  providers: [SkillService],
  // TypeOrmModule.forFeature() allows to import Modules with circular dependencies
  imports: [
    TypeOrmModule.forFeature([Skill]),
    forwardRef(() => TenantModule),
    forwardRef(() => UserModule),
  ],
  exports: [SkillService],
})
export class SkillModule {}
