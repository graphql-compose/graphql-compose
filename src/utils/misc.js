/* @flow */

import pluralize from './pluralize';


export function resolveMaybeThunk<T>(thingOrThunk: T | () => T): T { // eslint-disable-line
  return typeof thingOrThunk === 'function' ? thingOrThunk() : thingOrThunk;
}

export function isString(value: mixed): boolean {
  return typeof value === 'string';
}


export function isObject(value: mixed): boolean {
  return typeof value === 'object' && !Array.isArray(value) && value !== null;
}


export function isFunction(value: mixed): boolean {
  return !!(value && value.constructor && value.call && typeof value === 'function' && value.apply);
}

export function camelCase(str: string): string {
  return str.replace(
    /(?:^\w|[A-Z]|\b\w)/g,
    (letter, index) => (index === 0 ? letter.toLowerCase() : letter.toUpperCase())
  ).replace(/\s+/g, '');
}


export function getPluralName(name: string): string {
  return pluralize(camelCase(name));
}


export function upperFirst(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}


export function omit(object: Object, keys: string[]) {
  if (!object) {
    return {};
  }

  const result = Object.assign({}, object);
  if (Array.isArray(keys)) {
    keys.forEach((k) => { delete result[k]; });
  } else {
    delete result[keys];
  }

  return result;
}


/**
 *
 * Convert object to dotted-key/value pair
 *
 * Usage:
 *
 *   var dotObject(obj)
 *
 *   or
 *
 *   var tgt = {}
 *   dotObject(obj, target)
 *
 * @param {Object} obj source object
 * @param {Object} target target object
 * @param {Array} path path array (internal)
 */
export function dotObject(obj: Object, target: Object, path: string[]):Object {
  /* eslint-disable */
  target = target || {};
  path = path || [];
  Object.keys(obj).forEach((key) => {
    if (Object(obj[key]) === obj[key]) {
      return dotObject(obj[key], target, path.concat(key));
    } else {
      target[path.concat(key).join('.')] = obj[key];
    }
  });
  return target;
  /* eslint-enable */
}
