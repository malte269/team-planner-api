import { BaseEntity } from '../common/base.entity';
import { Dto } from '../common/base.dto';
import { DateTime } from 'luxon';

type IfEquals<X, Y, A, B> = (<T>() => T extends X ? 1 : 2) extends <
  T,
>() => T extends Y ? 1 : 2
  ? A
  : B;

export type KeyOfWithTypeOf<Entity, V = any> = {
  [K in keyof Entity]-?: Entity[K] extends V ? K : never;
}[keyof Entity];
export type KeyOf<Entity, V = any> = KeyOfWithTypeOf<Entity, V> & string;
export type OmitKeyOf<Entity, V = any> = {
  [K in keyof Entity]-?: Entity[K] extends V ? never : K;
}[keyof Entity] &
  string;

export type WritableKeysOf<Entity> = {
  [K in keyof Entity]: IfEquals<
    { [Q in K]: Entity[K] },
    { -readonly [Q in K]: Entity[K] },
    K,
    never
  >;
}[keyof Entity];

export type AsDto<
  Entity extends BaseEntity<any>,
  Optional extends keyof Entity = 'id',
> = {
  [K in OmitKeyOf<Entity, (...args: any) => any> &
    WritableKeysOf<Entity> &
    keyof Omit<Entity, Optional> &
    OmitOptionalKeys<Entity>]: DtoType<Entity[K]>;
} & {
  [P in Optional]?: DtoType<Entity[P]>;
};

export type DtoType<V> = V extends Date | DateTime
  ? V | string
  : V extends BaseEntity<any>
  ? Partial<AsDto<V>>
  : V extends BaseEntity<any>[]
  ? Partial<AsDto<SingleType<V>>>[]
  : V | undefined | string;

export type OmitOptionalKeys<Entity> = {
  [K in keyof Entity]-?: Entity[K] extends Required<Entity[K]> ? K : never;
}[keyof Entity];

export type ObjectWithId<Entity extends { id?: string }> = Required<
  Pick<Entity, 'id'>
> &
  Partial<Entity>;

/**
 * Pick keys that are either required or optional
 */
export type Concatenate<
  Model,
  RequiredKeys extends keyof Model,
  OptionalKeys extends keyof Model,
> = Required<Pick<Model, RequiredKeys>> & Partial<Pick<Model, OptionalKeys>>;
/**
 * Omit some keys and make the others required
 */
export type Require<
  Model extends Dto<Model> | BaseEntity<Model>,
  Keys extends keyof Model,
> = Required<Pick<Model, Keys>> & Omit<Model, Keys>;
/**
 * Omit some keys and make the others partial
 */
export type Partiality<
  Model extends Dto<Model> | BaseEntity<Model>,
  Keys extends keyof Model & string,
> = Partial<Pick<Model, Keys>> & Omit<Model, Keys>;
export type RelationKey<Model> = KeyOf<
  Model,
  BaseEntity<any> | BaseEntity<any>[]
>;
export type SingleOrMultiple<T> = T extends (infer R)[] ? R | R[] : T | T[];
export type SingleType<T> = T extends (infer R)[] ? R : T;
type QueryWhereType<T> = T extends boolean ? T : SingleOrMultiple<T>;
export type EntityWhereQuery<
  Entity,
  QueryValueTypes = string | number | boolean | undefined | string[] | number[],
> = {
  [key in KeyOf<Entity, QueryValueTypes>]?: QueryWhereType<Entity[key]>;
};
/**
 Append the following decorators to your function
 ```
 @ApiQuery({ name: 'skip', type: 'number', required: false })
 @ApiQuery({ name: 'limit', type: 'number', required: false })
 @ApiQuery({ name: 'sort', type: 'string', required: false, example: 'createdAt+DESC' })
 ```
 */
export type QueryParams<Entity> = EntityWhereQuery<Entity> & {
  skip?: string;
  limit?: string;
  sort?: string[] | string;
  select?: string[] | string;
  populate?: RelationKey<Entity>[] | RelationKey<Entity>;
};
