import { HttpStatus } from '@nestjs/common';
import { asErrorCollection } from '../../common/decorators/ApiResponses.decorator';

export const WORK_TIME_ERROR_CREATE = asErrorCollection({
  WEEKLY_AMOUNT_CONFLICT: [
    HttpStatus.CONFLICT,
    'WEEKLY_AMOUNT_CONFLICT',
    'The calculated and provided weekly amount does not match',
  ],
});

export const WORK_TIME_ERROR_UPDATE = asErrorCollection({
  WEEKLY_AMOUNT_CONFLICT: [
    HttpStatus.CONFLICT,
    'WEEKLY_AMOUNT_CONFLICT',
    'The calculated and provided weekly amount does not match',
  ],
});

export const WORK_TIME_ERROR_DELETE = asErrorCollection({});
