import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../models/user/user.entity';

export const UserToken = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    // user object was parsed to instance already in jwt.strategy
    return request.user;
  },
);
