/* @flow */

export function isString(value: mixed): boolean {
  return typeof value === 'string';
}

export function isObject(value: mixed): boolean {
  return typeof value === 'object' && !Array.isArray(value) && value !== null;
}

export function isFunction(value: mixed): boolean {
  return !!(value && value.constructor && value.call && typeof value === 'function' && value.apply);
}
