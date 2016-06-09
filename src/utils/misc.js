import pluralize from './pluralize';


export function isString(value) {
  return typeof value === 'string';
}


export function isObject(value) {
  return (typeof value === 'object' && !Array.isArray(value) && value !== null);
}


export function isFunction(value) {
  return !!(value && value.constructor && value.call && value.apply);
}

export function getNameViaOpts(defaultName, opts) {
  if (isString(opts)) {
    return opts;
  } else if (isObject(opts) && isString(opts.name)) {
    return opts.name;
  }

  return defaultName;
}

export function camelCase(str) {
  return str.replace(
    /(?:^\w|[A-Z]|\b\w)/g,
    (letter, index) => index === 0 ? letter.toLowerCase() : letter.toUpperCase()
  ).replace(/\s+/g, '');
}


export function getPluralName(name) {
  return pluralize(camelCase(name));
}


export function upperFirst(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}


export function omit(object, keys) {
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
export function dotObject(obj, target, path) {
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
