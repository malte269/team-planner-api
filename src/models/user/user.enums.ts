import { HttpStatus } from '@nestjs/common';
import { asErrorCollection } from '../../common/decorators/ApiResponses.decorator';

export const USER_ERROR_CREATE = asErrorCollection({
  UNIQUE: [
    HttpStatus.CONFLICT,
    'UNIQUE',
    'There is already a user with this email',
  ],
  INVALID_VALID_FROM: [
    HttpStatus.CONFLICT,
    'INVALID_VALID_FROM',
    'More than one workTime has invalid or undefined validFrom value',
  ],
  DUPLICATE_VALID_FROM: [
    HttpStatus.CONFLICT,
    'DUPLICATE_VALID_FROM',
    'More than one workTime is valid from the same date',
  ],
});

export const USER_ERROR_UPDATE = asErrorCollection({
  UNIQUE: [
    HttpStatus.CONFLICT,
    'UNIQUE',
    'There is already a user with this email and tenant',
  ],
});

export const USER_ERROR_DELETE = asErrorCollection({});
