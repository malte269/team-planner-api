import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import {
  asErrorCollection,
  ErrorCollectionItem,
} from './decorators/ApiResponses.decorator';
import { format } from 'util';

export const RES_ERROR_GENERIC = asErrorCollection({
  INTERNAL_SERVER_ERROR: [
    HttpStatus.INTERNAL_SERVER_ERROR,
    'INTERNAL_SERVER_ERROR',
    'Some internal stuff went wrong :/',
  ],
  NOT_FOUND: [
    HttpStatus.NOT_FOUND,
    'NOT_FOUND',
    'Record was not found or you have no access to it.',
  ],
  FORBIDDEN: [
    HttpStatus.FORBIDDEN,
    'FORBIDDEN',
    'You are not allowed to call this function',
  ],
  BAD_REQUEST: [
    HttpStatus.BAD_REQUEST,
    'BAD_REQUEST',
    'The sent data is ambiguous. %s',
  ],
  PERMISSION: [
    HttpStatus.FORBIDDEN,
    'PERMISSION',
    'You do not have the permission to do this',
  ],
  NOT_IMPLEMENTED: [
    HttpStatus.NOT_IMPLEMENTED,
    'NOT_IMPLEMENTED',
    'This functionality is not implemented yet',
  ],
  MISSING_TENANT: [
    HttpStatus.BAD_REQUEST,
    'MISSING_TENANT',
    'No tenantId found in request body or in users access token',
  ],
  IS_VC: [
    HttpStatus.UNPROCESSABLE_ENTITY,
    'IS_VC',
    'This is a vc log entity. %s not allowed. Model: %s',
  ],
  DELETED: [
    HttpStatus.FORBIDDEN,
    'DELETED',
    'The record is already deleted. Update not allowed. Model: %s',
  ],
  CANNOT_UPDATE: [
    HttpStatus.BAD_REQUEST,
    'CANNOT_UPDATE',
    'The attribute %s cannot be updated. You have no access or it was not found',
  ],
  IS_REQUIRED: [
    HttpStatus.UNPROCESSABLE_ENTITY,
    'IS_REQUIRED',
    'The attribute %s is required, but was set to %s.',
  ],
  NOT_AN_OBJECT: [HttpStatus.CONFLICT, 'NOT_AN_OBJECT', '%s is not an object'],
  NOT_DELETED: [
    HttpStatus.CONFLICT,
    'NOT_DELETED',
    'Record could not be removed',
  ],
  EMPTY_LIMIT: [
    HttpStatus.BAD_REQUEST,
    'EMPTY_LIMIT',
    'You have to provide limit parameter as well',
  ],
  INVALID_AUTH_HASH: [
    HttpStatus.NOT_IMPLEMENTED,
    'INVALID_AUTH_HASH',
    `AuthHash with type %s not implemented`,
  ],
  MISSING_PARAM: [
    HttpStatus.BAD_REQUEST,
    'MISSING_PARAM',
    'Missing parameters:',
  ],
  CHAT_DOESNT_RESPOND: [
    HttpStatus.INTERNAL_SERVER_ERROR,
    'CHAT_DOESNT_RESPOND',
    'Something went wrong in chat: ',
  ],
});

export class ResException extends HttpException {
  constructor(errorCollectionItem: ErrorCollectionItem);
  constructor(errorCollectionItem: ErrorCollectionItem, variables: string[]);
  constructor(code: HttpStatus, key: string, message: string);
  constructor(
    code: HttpStatus,
    key: string,
    message: string,
    variables: string[],
  );

  constructor(
    codeOrItem: HttpStatus | ErrorCollectionItem,
    key?: string | string[],
    message?: string,
    variables?: string[],
  ) {
    let code;
    if (message && Array.isArray(message)) {
      variables = message;
      message = '';
    }
    if (typeof codeOrItem === 'number') {
      code = codeOrItem;
    } else {
      // the key can only be a string array, if the codeOrItem is not a just number. Then it will be overwritten.
      // Otherwise, it is a normal string
      if (Array.isArray(key)) {
        variables = key;
      }
      code = (codeOrItem as ErrorCollectionItem)[0];
      key = (codeOrItem as ErrorCollectionItem)[1];
      message = (codeOrItem as ErrorCollectionItem)[2];
    }

    if (variables) {
      message = format(message, ...variables);
    }

    super(new ResExceptionScheme(code, key as string, message), code);
  }
}

export class ResExceptionScheme {
  @ApiProperty()
  public code: HttpStatus;
  @ApiProperty()
  public message: string;
  @ApiProperty()
  public key: string;

  constructor(code: HttpStatus, key: string, message: string) {
    this.code = code;
    this.key = key;
    this.message = message;
  }
}
