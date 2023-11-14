import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { ResException } from '../common/ResException';
import { AUTH_ERROR_GUARD } from './auth.enums';

/**
 * Used for Login Route
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !user || info) {
      throw new ResException(AUTH_ERROR_GUARD.UNAUTHORIZED, [
        (err || info).toString(),
      ]);
    }
    return user;
  }
}

@Injectable()
export class LocalApiKeyAuthGuard extends AuthGuard('localapikey') {
  handleRequest(err, user, info) {
    if (err || info) {
      throw new ResException(AUTH_ERROR_GUARD.UNAUTHORIZED, [
        (err || info).toString(),
      ]);
    }
    return user;
  }
}
