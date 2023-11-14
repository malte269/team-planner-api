import { HttpStatus } from '@nestjs/common';
import { asErrorCollection } from '../../common/decorators/ApiResponses.decorator';

export const SKILL_ERROR_CREATE = asErrorCollection({
  UNIQUE: [HttpStatus.CONFLICT, 'UNIQUE', 'This Skill already exists'],
  MISSING_NAME: [HttpStatus.CONFLICT, 'MISSING_NAME', 'A skill needs a name'],
  INVALID_CHARACTER: [
    HttpStatus.CONFLICT,
    'INVALID_CHARACTER',
    'At least one character of the name is not allowed: ",", "+"',
  ],
});
