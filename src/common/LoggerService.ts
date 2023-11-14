import { Injectable, LoggerService, LogLevel } from '@nestjs/common';

@Injectable()
export class PLoggerService implements LoggerService {
  private static singleton: PLoggerService;

  public levels: LogLevel[] = ['error', 'warn', 'log'];

  static get instance(): PLoggerService {
    if (!this.singleton) {
      this.singleton = new PLoggerService();
    }
    return this.singleton;
  }

  constructor(...args) {
    this.levels = args[0];

    if (!PLoggerService.singleton) {
      PLoggerService.singleton = this;
    } else {
      return PLoggerService.singleton;
    }
  }

  setLogLevels(levels: LogLevel[]): any {
    this.levels = levels;
  }

  debug(message: any, ...optionalParams: [...any, string?]): any {
    if (!this.levels.includes('debug')) {
      return;
    }
    if (!Array.isArray(message)) {
      message = [message];
    }

    console.log('[DEBUG]', ...optionalParams, ...message);
  }

  error(message: any, ...optionalParams: [...any, string?]): any {
    if (!this.levels.includes('error')) {
      return;
    }
    if (!Array.isArray(message)) {
      message = [message];
    }

    console.error('[ERROR]', ...optionalParams, ...message);
  }

  log(message: any, ...optionalParams: [...any, string?]): any {
    if (!this.levels.includes('log')) {
      return;
    }
    if (!Array.isArray(message)) {
      message = [message];
    }

    console.log('[ LOG ]', ...optionalParams, ...message);
  }

  verbose(message: any, ...optionalParams: [...any, string?]): any {
    if (!this.levels.includes('verbose')) {
      return;
    }
    if (!Array.isArray(message)) {
      message = [message];
    }

    console.log('[VRBSE]', ...optionalParams, ...message);
  }

  warn(message: any, ...optionalParams: [...any, string?]): any {
    if (!this.levels.includes('warn')) {
      return;
    }
    if (!Array.isArray(message)) {
      message = [message];
    }

    console.warn('[WARN ]', ...optionalParams, ...message);
  }
}
