import {
  isEmail,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'signatureData', async: false })
export class SignatureData implements ValidatorConstraintInterface {
  validate(value?: string): Promise<boolean> | boolean {
    return (
      value?.trim().length > 0 &&
      value.split('x').every((path: string) =>
        path
          .split(';')
          .map((point: string) => point.split(','))
          .every(
            (point: string[]) =>
              point.length === 2 &&
              !Number.isNaN(Number(point[0])) &&
              !Number.isNaN(Number(point[1])),
          ),
      )
    );
  }

  defaultMessage(validationArguments?: ValidationArguments): string {
    return `A Signature has to be a string of numbers separated by "x", "," or ";". Got ${validationArguments.value}`;
  }
}

@ValidatorConstraint({ name: 'email', async: false })
export class EmailValidation implements ValidatorConstraintInterface {
  validate(email?: string): Promise<boolean> | boolean {
    return email ? isEmail(email) : true;
  }

  defaultMessage(): string {
    return 'The email is no email';
  }
}
