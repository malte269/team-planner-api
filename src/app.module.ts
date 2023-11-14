import { Logger, MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { config } from '../ormconfig';
import { RequestLoggerMiddleware } from './common/middleware/request-logger-middleware.service';
import { UserModule } from './models/user/user.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards';
import { APP_GUARD } from '@nestjs/core';
import * as path from 'path';
import { I18nModule } from 'nestjs-i18n';
import { ScheduleModule } from '@nestjs/schedule';
import { CronService } from './cron/cron.service';
import { IssueModule } from './models/issue/issue.module';
import { ProjectModule } from './models/project/project.module';
import { SkillModule } from './models/skill/skill.module';
import { WorkTimeModule } from './models/work-time/workTime.module';
import { TenantModule } from './models/tenant/tenant.module';
import { GroupModule } from './models/group/group.module';
import { IncrementModule } from './models/increment/increment.module';
import { PhaseModule } from './models/phase/phase.module';
import { SlotModule } from './models/slot/slot.module';
import { SettingsModule } from './models/settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'de',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: false,
      },
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      useFactory: () => config as TypeOrmModuleOptions,
    }),
    AuthModule,
    UserModule,
    TenantModule,
    ProjectModule,
    IncrementModule,
    GroupModule,
    PhaseModule,
    IssueModule,
    SlotModule,
    SkillModule,
    WorkTimeModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    CronService,
  ],
})
export class AppModule {
  private readonly logger = new Logger(AppModule.name);

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
    // this.logger.log(JSON.stringify(process.env));
  }
}
