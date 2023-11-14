import { BaseEntity } from '../common/base.entity';
import { DateTime } from 'luxon';
import { KeyOf, KeyOfWithTypeOf, QueryParams, SingleType } from './Typings';

// this function is for data that is too much for the set datatype
/**
 * This function returns an array of the intersection of the two given arrays
 * @param array The array to check
 * @param possibleValues The array with all the values possible
 * returns true, the element is passed to the new array
 */
export function toUniqueArray<ArrayType>(
  array: ArrayType[],
  possibleValues?: ArrayType[],
): ArrayType[] {
  // first filter the values of the array for the ones in the others array, if defined. Then cast it to a set to remove
  // duplicates and then cast it back to an array
  return new Array(
    ...new Set(
      possibleValues
        ? array.filter((el: ArrayType) => possibleValues.includes(el))
        : array,
    ),
  );
}

export const DateTimeStringTransformer = {
  from: (value: string) => (value ? DateTime.fromISO(value) : null),
  to: (value: any) =>
    // value can also be a NestJs Find Operator, because this is also executed in NestJs' find calls
    value instanceof DateTime
      ? value.toJSDate()
      : typeof value === 'string'
      ? DateTime.fromISO(value).toJSDate()
      : value,
};

export function getEndOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function useDefaultValue<Type>(
  obj: Type,
  key: KeyOf<Type>,
  defaultValue: any,
) {
  obj[key] = obj[key] !== undefined ? obj[key] : defaultValue;
}

/**
 * Applies default values, without replacing the incoming query values
 * @param query
 * @param key
 * @param values
 */
export function applyDefaultQueryValues<
  Model extends BaseEntity<Model>,
  Key extends KeyOfWithTypeOf<QueryParams<Model>, string[] | string>,
>(
  query: QueryParams<Model>,
  key: Key,
  values: SingleType<QueryParams<Model>[Key]>[],
) {
  // save values
  let tempValues = query[key] as string | string[];
  // write default values to populate
  query[key] = values as QueryParams<Model>[Key];

  if (tempValues) {
    if (typeof tempValues === 'string') {
      // could be a comma separated string
      tempValues = tempValues.split(',');
    }
    (query[key] as string[]) = [...tempValues, ...(query[key] as any[])];
  }
}

export function parseStringBoolean(value: string | boolean) {
  switch (value) {
    case true:
    case 'true':
      return true;
    default:
      return false;
  }
}

/**
 * This method splits an array into two, depending on a boolean callback. The result is a 2 dimension array , where the
 * first array is the true condition and the second is the false condition
 * @param arr
 * @param callback
 */
export function splitArray<Type>(
  arr: Type[],
  callback: (v: Type) => boolean,
): Type[][] {
  return arr.reduce(
    (result: Type[][], currentValue: Type) => {
      result[callback(currentValue) ? 0 : 1].push(currentValue);
      return result;
    },
    [[], []],
  );
}

export function sortArray<Model>(
  arr: Model[],
  desc: boolean,
  attr:
    | ((el: Model) => number | string)
    | KeyOf<Model, string | number | undefined>,
): Model[];
export function sortArray(arr: number[], desc?: boolean): number[];
export function sortArray(arr: string[], desc?: boolean): string[];

export function sortArray<Model>(
  arr: Model[],
  desc: boolean = false,
  attributeOrCallback?: ((el: Model) => number | string) | KeyOf<Model>,
): Model[] {
  const callback =
    typeof attributeOrCallback === 'function'
      ? attributeOrCallback
      : (el: Model) => (attributeOrCallback ? el[attributeOrCallback] : el);
  return arr.sort((a, b) =>
    desc
      ? callback(a) < callback(b)
        ? 1
        : -1
      : callback(a) > callback(b)
      ? 1
      : -1,
  );
}

export function removeFromArray(
  elementToRemove: number,
  array: number[],
): boolean;

export function removeFromArray(
  elementToRemove: string,
  array: string[],
): boolean;

export function removeFromArray<Type>(
  elementToRemove: Type,
  array: Type[],
  keyOrCallback?: keyof Type | ((el: Type) => boolean),
): boolean;

export function removeFromArray<Type>(
  elementToRemove: Type,
  array: Type[],
  keyOrCallback?: keyof Type | ((el: Type) => boolean),
): boolean {
  const condition =
    keyOrCallback &&
    (typeof keyOrCallback === 'function'
      ? keyOrCallback
      : (el: Type): boolean =>
          el[keyOrCallback] === elementToRemove[keyOrCallback]);
  const index = array.findIndex(condition ?? ((el) => el === elementToRemove));
  return index > -1 && !!array.splice(index, 1);
}

/**
 * Tests if the arrOrEl has values in common with arr. If remove is true, the intersection values are removed from arr
 * @param arrOrEl
 * @param arr
 * @param remove
 */
export function arrayIntersection<T>(
  arr: T[],
  arrOrEl: T[] | T,
  remove: boolean = false,
) {
  const intersections = arr.filter((el) =>
    Array.isArray(arrOrEl) ? arrOrEl.includes(el) : el === arrOrEl,
  );
  // remove intersections elements from arr
  if (remove) {
    intersections.forEach((intersection) => {
      // index is always > -1
      const index = arr.findIndex((el) => el === intersection);
      arr.splice(index, 1);
    });
  }
  return intersections;
}

export function parseQueryString(value: string | string[]) {
  return Array.isArray(value) ? value : value?.split(',') ?? [];
}

/**
 * Returns 0 or 1
 */
export function randInt(): number;
/**
 * Returns a random int from 0 to "to" including 0 and to
 * @param to maximum int value
 */
export function randInt(to: number): number;
/**
 * Returns a random int from "from" to "to" including "from" and "to"
 * @param from
 * @param to
 */
export function randInt(from: number, to: number): number;

export function randInt(from: number = 1, to?: number) {
  if (to === undefined || to === null) {
    to = from ?? 1;
    from = 0;
  }
  return Math.round(Math.random() * (to - from) + from);
}

export function getArray<Entity>(
  array: Entity[] | undefined,
  defaultValue: Entity[] = [],
): Entity[] {
  return (array ?? []).length > 0 ? array : defaultValue;
}
export async function getArrayAsync<Entity>(
  array: Entity[] | undefined,
  defaultValue: Promise<Entity[]>,
): Promise<Entity[]> {
  return (array ?? []).length > 0 ? array : defaultValue;
}

export function getDateTime(object: string | DateTime | null): null | DateTime {
  if (!object) {
    return null;
  }
  return typeof object === 'string' ? DateTime.fromISO(object) : object;
}
