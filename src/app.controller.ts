import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import * as package_json from '../package.json';
import { Public } from './auth/decorators/public.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';

@Public()
@Controller()
@ApiBearerAuth()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    return this.version();
  }

  @Get('health')
  health() {
    return this.version();
  }

  @Get('version')
  version() {
    return { version: package_json.version };
  }
}
