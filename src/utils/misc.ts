/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-nested-ternary */

import { isObject } from './is';
import { pluralize } from './pluralize';
import type { Thunk, ObjMap } from './definitions';

export function resolveMaybeThunk<T>(thingOrThunk: Thunk<T>): T {
  return typeof thingOrThunk === 'function' ? (thingOrThunk as any)() : thingOrThunk;
}

export function camelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) =>
      index === 0 ? letter.toLowerCase() : letter.toUpperCase()
    )
    .replace(/\s+/g, '');
}

export function getPluralName(name: string): string {
  return pluralize(camelCase(name));
}

export function upperFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function clearName(str: string): string {
  return str.replace(/[^_a-zA-Z0-9]/g, '');
}

export function omit(obj: Record<any, any>, keys: string | string[]): Record<any, any> {
  if (!obj) {
    return {};
  }

  const result = { ...obj };
  if (Array.isArray(keys)) {
    keys.forEach((k) => {
      delete result[k];
    });
  } else {
    delete result[keys];
  }

  return result;
}

export function only(obj: Record<any, any>, keys: string | string[]): Record<any, any> {
  if (!obj) {
    return {};
  }

  const result = {} as any;
  if (Array.isArray(keys)) {
    keys.forEach((k) => {
      if ({}.hasOwnProperty.call(obj, k)) {
        result[k] = obj[k];
      }
    });
  } else if ({}.hasOwnProperty.call(obj, keys)) {
    result[keys] = obj[keys];
  }

  return result;
}

function inspectObject(value: Record<any, any>): string {
  let name;
  if (value && value.constructor && value.constructor.name) {
    name = value.constructor.name;
  }

  const props = `{ ${Object.keys(value)
    .filter((n) => n !== 'loc')
    .map((k) => `${k}: ${inspect((value as any)[k])}`)
    .join(', ')} }`;

  return name ? `${name}(${props})` : props;
}

/**
 * Used to print values in error messages.
 */
export function inspect(value: unknown): string {
  return value && typeof value === 'object'
    ? typeof (value as any).inspect === 'function'
      ? (value as any).inspect()
      : Array.isArray(value)
      ? `[${value.map(inspect).join(', ')}]`
      : inspectObject(value)
    : typeof value === 'string'
    ? `"${value}"`
    : typeof value === 'function'
    ? `[function ${value.name}]`
    : String(value);
}

/**
 * Traverse object like Array.forEach
 *
 * @example
 *     const obj = { a: 1, b: 2, c: 3 };
 *     let result = '';
 *     forEachKey(obj, (v, k) => { result += `${v},${k};`; });
 *     // result = '1,a;2,b;3,c;'
 */
export function forEachKey<V>(
  obj: { [key: string]: V } | ObjMap<V>,
  callback: (value: V, key: string) => void
): void {
  Object.keys(obj).forEach((key) => {
    callback(obj[key], key);
  });
}

/**
 * Traverse object like Array.map
 *
 * @example
 *      const obj = { a: 1, b: 2, c: 3 };
 *      const result = mapEachKey(obj, (v, k) => `${v}${k}`);
 *      // result = { a: '1a', b: '2b', c: '3c' }
 */
export function mapEachKey<NewV = any, T extends Object | undefined = {}>(
  obj: T,
  callback: (value: NonNullable<T>[keyof NonNullable<T>], key: keyof NonNullable<T>) => NewV
): T extends undefined ? undefined : ObjMap<NewV> {
  if (!isObject(obj)) return obj as any;
  const result = {} as any;
  Object.keys(obj).forEach((key: any) => {
    result[key] = callback((obj as any)[key], key);
  });
  return result;
}

/**
 * Creates a keyed JS object from an array, given a function to produce the keys
 * and a function to produce the values from each item in the array.
 *
 *     const phoneBook = [
 *       { name: 'Jon', num: '555-1234' },
 *       { name: 'Jenny', num: '867-5309' }
 *     ]
 *
 *     // { Jon: '555-1234', Jenny: '867-5309' }
 *     const phonesByName = keyValMap(
 *       phoneBook,
 *       entry => entry.name,
 *       entry => entry.num
 *     )
 *
 */
export function keyValMap<T, V>(
  list: ReadonlyArray<T>,
  keyFn: (item: T) => string,
  valFn: (item: T) => V
): ObjMap<V> {
  const result = Object.create(null);
  for (const item of list) {
    result[keyFn(item)] = valFn(item);
  }
  return result;
}

/**
 * Creates a keyed JS object from an array, given a function to produce the keys
 * for each value in the array.
 *
 * This provides a convenient lookup for the array items if the key function
 * produces unique results.
 *
 *     const phoneBook = [
 *       { name: 'Jon', num: '555-1234' },
 *       { name: 'Jenny', num: '867-5309' }
 *     ]
 *
 *     // { Jon: { name: 'Jon', num: '555-1234' },
 *     //   Jenny: { name: 'Jenny', num: '867-5309' } }
 *     const entriesByName = keyMap(
 *       phoneBook,
 *       entry => entry.name
 *     )
 *
 *     // { name: 'Jenny', num: '857-6309' }
 *     const jennyEntry = entriesByName['Jenny']
 *
 */
export function keyMap<T>(list: ReadonlyArray<T>, keyFn: (item: T) => string): ObjMap<T> {
  const result = Object.create(null);
  for (const item of list) {
    result[keyFn(item)] = item;
  }
  return result;
}

export function invariant(condition: unknown, message?: string): asserts condition {
  const booleanCondition = Boolean(condition);
  // istanbul ignore else (See transformation done in './resources/inlineInvariant.js')
  if (!booleanCondition) {
    throw new Error(message != null ? message : 'Unexpected invariant triggered.');
  }
}
