import { asErrorCollection } from '../../common/decorators/ApiResponses.decorator';
import { HttpStatus } from '@nestjs/common';

export const PHASE_ERROR_CREATE = asErrorCollection({
  UNIQUE: [
    HttpStatus.CONFLICT,
    'UNIQUE',
    'There is already a phase with that index on the requested object',
  ],
  INCREMENT_NOT_FOUND: [
    HttpStatus.NOT_FOUND,
    'INCREMENT_NOT_FOUND',
    'The requested increment was not found or you have no access to it',
  ],
  PROJECT_NOT_FOUND: [
    HttpStatus.NOT_FOUND,
    'INCREMENT_NOT_FOUND',
    'The requested project was not found ot you have no access to it',
  ],
  ID_MISS_MATCH: [
    HttpStatus.CONFLICT,
    'ID_MISS_MATCH',
    'The project of the increment and the phase does not match',
  ],
});

export const PHASE_ERROR_UPDATE = asErrorCollection({});

export const PHASE_ERROR_DELETE = asErrorCollection({});
