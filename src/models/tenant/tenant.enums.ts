import { HttpStatus } from '@nestjs/common';
import { asErrorCollection } from '../../common/decorators/ApiResponses.decorator';

export const TENANT_ERROR_CREATE = asErrorCollection({
  UNIQUE: [
    HttpStatus.CONFLICT,
    'UNIQUE',
    'There is already a tenant with this name',
  ],
});

export const TENANT_ERROR_UPDATE = asErrorCollection({
  UNIQUE: [
    HttpStatus.CONFLICT,
    'UNIQUE',
    'There is already a user with this name',
  ],
});

export const TENANT_ERROR_DELETE = asErrorCollection({});
