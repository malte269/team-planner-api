import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkTime } from './workTime.entity';
import { WorkTimeService } from './workTime.service';
import { UserModule } from '../user/user.module';

@Module({
  controllers: [],
  providers: [WorkTimeService],
  // TypeOrmModule.forFeature() allows to import Modules with circular dependencies
  imports: [TypeOrmModule.forFeature([WorkTime]), forwardRef(() => UserModule)],
  exports: [WorkTimeService],
})
export class WorkTimeModule {}
