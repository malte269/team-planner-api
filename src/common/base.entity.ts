import {
  Column,
  CreateDateColumn,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { KeyOf } from '../helper/Typings';

export abstract class BaseEntity<Model> {
  @PrimaryGeneratedColumn('uuid')
  public id!: string;

  @CreateDateColumn({ type: 'timestamp' })
  @Index()
  public createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  @Index()
  public updatedAt!: Date;

  @Column({
    default: false,
  })
  deleted: boolean;

  constructor(object?: Partial<Model>) {
    Object.assign(this, object);
  }

  clone(deep: boolean = true): Model {
    const clone: BaseEntity<Model> = new (this.constructor as any)(this);
    // remove all undefined or null keys
    Object.keys(clone).forEach((key: string) => {
      if (clone[key] === undefined || clone[key] === null) {
        delete clone[key];
      }
    });
    if (deep) {
      // make a deep copy with cloning what is possible
      Object.keys(clone).forEach((key) => {
        if (Array.isArray(clone[key])) {
          clone[key] = clone[key].map(
            (el: any) => (el.clone && el.clone()) || el,
          );
        } else {
          clone[key] = (clone[key].clone && clone[key].clone()) || clone[key];
        }
      });
    }
    return clone as Model;
  }
}

/**
 * Helper function to be sure to be consistent, if working with model keys
 * @param key
 */
export function key<Model extends BaseEntity<Model>, Type = any>(
  key: KeyOf<Model, Type>,
) {
  return key;
}
