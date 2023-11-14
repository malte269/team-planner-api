import { asErrorCollection } from '../../common/decorators/ApiResponses.decorator';
import { HttpStatus } from '@nestjs/common';

export const MODULE_ERROR_CREATE = asErrorCollection({});

export const MODULE_ERROR_UPDATE = asErrorCollection({
  INCREMENT_NOT_FOUND: [
    HttpStatus.NOT_FOUND,
    'INCREMENT_NOT_FOUND',
    'The required increment was not found',
  ],
  PHASE_NOT_FOUND: [
    HttpStatus.NOT_FOUND,
    'PHASE_NOT_FOUND',
    'The required phase was not found',
  ],
});

export const MODULE_ERROR_DELETE = asErrorCollection({});
