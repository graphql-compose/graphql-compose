/* @flow */

import pluralize from './pluralize';


export function resolveMaybeThunk<T>(thingOrThunk: T | () => T): T { // eslint-disable-line
  return typeof thingOrThunk === 'function' ? thingOrThunk() : thingOrThunk;
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


export function upperFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}


export function clearName(str: string): string {
  return str.replace(/[^_a-zA-Z0-9]/g, '');
}


export function omit(obj: Object, keys: string[]) {
  if (!obj) {
    return {};
  }

  const result = Object.assign({}, obj);
  if (Array.isArray(keys)) {
    keys.forEach((k) => { delete result[k]; });
  } else {
    delete result[keys];
  }

  return result;
}

export function only(obj: Object, keys: string[]) {
  if (!obj) {
    return {};
  }

  const result = {};
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
