import { asErrorCollection } from '../../common/decorators/ApiResponses.decorator';
import { HttpStatus } from '@nestjs/common';

export const INCREMENT_ERROR_CREATE = asErrorCollection({
  MALFORMED_PHASES: [
    HttpStatus.CONFLICT,
    'MALFORMED_PHASES',
    'Some phases could not be created',
  ],
});

export const INCREMENT_ERROR_UPDATE = asErrorCollection({});

export const INCREMENT_ERROR_DELETE = asErrorCollection({});
