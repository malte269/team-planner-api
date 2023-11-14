import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { UserService } from '../models/user/user.service';

@Module({
  controllers: [],
  providers: [CronService],
  imports: [UserService],
  exports: [CronService],
})
export class CronModule {}
