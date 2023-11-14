import { HttpStatus } from '@nestjs/common';
import { asErrorCollection } from '../../common/decorators/ApiResponses.decorator';

export const SETTINGS_ERROR_CREATE = asErrorCollection({
  INVALID_BODY: [
    HttpStatus.CONFLICT,
    'UNIQUE',
    'There is already a Project with this name',
  ],
});

export const SETTINGS_ERROR_UPDATE = asErrorCollection({});

export const SETTINGS_ERROR_DELETE = asErrorCollection({});
