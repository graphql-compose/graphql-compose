/* @flow */

// $FlowFixMe
export function isString(value: ?string) /* : boolean %checks */ {
  return typeof value === 'string';
}

// $FlowFixMe
export function isObject(value: ?Object) /* : boolean %checks */ {
  return typeof value === 'object' && !Array.isArray(value) && value !== null;
}

// $FlowFixMe
export function isFunction(value: ?Function) /* : boolean %checks */ {
  return !!(value && value.constructor && value.call && typeof value === 'function' && value.apply);
}
