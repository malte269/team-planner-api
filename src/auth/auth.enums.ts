import { HttpStatus } from '@nestjs/common';
import { asErrorCollection } from '../common/decorators/ApiResponses.decorator';

export const AUTH_ERROR_LOGIN = asErrorCollection({
  UNAUTHORIZED: [HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'Wrong Credentials'],
});

export const AUTH_ERROR_RESET_PASSWORD = asErrorCollection({
  EXPIRED: [HttpStatus.BAD_REQUEST, 'EXPIRED', 'link is expired'],
  NOT_FOUND: [HttpStatus.NOT_FOUND, 'NOT_FOUND', 'record not found'],
  TOO_MANY_REQUESTS: [
    HttpStatus.TOO_MANY_REQUESTS,
    'TOO_MANY_REQUESTS',
    'too many requests at a time',
  ],
});

export const AUTH_ERROR_REFRESH = asErrorCollection({
  EXPIRED_TOKEN: [
    HttpStatus.EXPECTATION_FAILED,
    'EXPIRED_TOKEN',
    'RefreshToken expired',
  ],
});

export const AUTH_ERROR_GUARD = asErrorCollection({
  UNAUTHORIZED: [HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', '%s'],
});
