import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggerMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const startDate = new Date();

    // res.end() will be called on all responses
    const originalEnd = res.end;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    res.end = (...args) => {
      this.log(req, res, startDate);
      originalEnd.call(res, ...args);
    };

    next();
  }

  private log(req: Request, res: Response, startDate: Date) {
    // no logging for OPTIONS requests
    if (req.method === 'OPTIONS') {
      return;
    }

    const endTime = Date.now();
    const duration = `${endTime - startDate.getTime()}`.padStart(5, ' ') + 'ms';

    this.logger.log(
      [`code:${res.statusCode}`, duration, req.method, req.url].join('\t'),
    );
  }
}
