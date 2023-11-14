import { asErrorCollection } from '../../common/decorators/ApiResponses.decorator';
import { HttpStatus } from '@nestjs/common';

import { DurationUnit } from '../../common/interfaces/timeline.interface';

export const ISSUE_ERROR_CREATE = asErrorCollection({
  MISSING_PROJECT: [
    HttpStatus.CONFLICT,
    'MISSING_PROJECT',
    'Please specify a project',
  ],
  INVALID_DURATION: [
    HttpStatus.CONFLICT,
    'INVALID_DURATION',
    'The duration needs to be a number greater than 0 if set',
  ],
  INVALID_DURATION_UNIT: [
    HttpStatus.CONFLICT,
    'INVALID_DURATION_UNIT',
    `Please specify a duration unit: ${Object.values(DurationUnit).join(', ')}`,
  ],
  INCREMENT_NOT_FOUND: [
    HttpStatus.NOT_FOUND,
    'INCREMENT_NOT_FOUND',
    'The increment was not found or you have no access to it',
  ],
  GROUP_NOT_FOUND: [
    HttpStatus.NOT_FOUND,
    'GROUP_NOT_FOUND',
    'The group was not found or you have no access to it',
  ],
});

export const ISSUE_ERROR_UPDATE = asErrorCollection({
  INCREMENT_NOT_FOUND: [
    HttpStatus.NOT_FOUND,
    'INCREMENT_NOT_FOUND',
    'The increment was not found or you have no access to it',
  ],
  GROUP_NOT_FOUND: [
    HttpStatus.NOT_FOUND,
    'GROUP_NOT_FOUND',
    'The group was not found or you have no access to it',
  ],
});

export const ISSUE_ERROR_DELETE = asErrorCollection({});
