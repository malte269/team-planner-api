import { HttpStatus } from '@nestjs/common';
import { asErrorCollection } from '../../common/decorators/ApiResponses.decorator';

export const PROJECT_ERROR_CREATE = asErrorCollection({
  UNIQUE: [
    HttpStatus.CONFLICT,
    'UNIQUE',
    'There is already a Project with this name',
  ],
  UNIQUE_SHORT: [
    HttpStatus.CONFLICT,
    'UNIQUE_SHORT',
    'There is already a Project with this short name',
  ],
  SWITCHED_TIMES: [
    HttpStatus.CONFLICT,
    'SWITCHED_TIMES',
    'The startDate is after the endDate',
  ],
  MALFORMED_PHASES: [
    HttpStatus.CONFLICT,
    'MALFORMED_PHASES',
    'Some phases could not be created',
  ],
  MALFORMED_INCREMENTS: [
    HttpStatus.CONFLICT,
    'MALFORMED_INCREMENTS',
    'Some increments could not be created',
  ],
});

export const PROJECT_ERROR_UPDATE = asErrorCollection({
  UNIQUE: [
    HttpStatus.CONFLICT,
    'UNIQUE',
    'There is already a user with this email and company',
  ],
});

export const PROJECT_ERROR_GENERATION = asErrorCollection({
  MISSING_SKILLS: [
    HttpStatus.CONFLICT,
    'MISSING_SKILLS',
    'Missing skills to filter for',
  ],
});

export const PROJECT_ERROR_DELETE = asErrorCollection({});
