import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Slot } from './slot.entity';
import { SlotService } from './slot.service';
import { TenantModule } from '../tenant/tenant.module';
import { UserModule } from '../user/user.module';
import { GroupModule } from '../group/group.module';
import { SlotController } from './slot.controller';

@Module({
  controllers: [SlotController],
  providers: [SlotService],
  // TypeOrmModule.forFeature() allows to import Modules with circular dependencies
  imports: [
    TypeOrmModule.forFeature([Slot]),
    forwardRef(() => TenantModule),
    forwardRef(() => UserModule),
    forwardRef(() => GroupModule),
  ],
  exports: [SlotService],
})
export class SlotModule {}
