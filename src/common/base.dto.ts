import { BaseEntity } from './base.entity';
import { AsDto } from '../helper/Typings';

export abstract class Dto<DtoModel>
  implements Partial<AsDto<BaseEntity<DtoModel>>>
{
  protected constructor(object: Partial<DtoModel> = {}) {
    Object.assign(this, object);
  }

  id?: string;

  createdAt?: Date | string;

  updatedAt?: Date | string;

  deleted?: boolean;
}
