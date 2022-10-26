/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable prefer-template, no-param-reassign, no-lonely-if */
// https://github.com/KyleAMathews/deepmerge/blob/master/index.js

export function deepmerge<T = any>(target: any, src: T): T {
  const array = Array.isArray(src);
  let dst = ((array && []) || {}) as any;

  if (array) {
    target = target || [];
    dst = dst.concat(target);
    (src as any).forEach((e: any, i: any) => {
      if (typeof dst[i] === 'undefined') {
        dst[i] = e;
      } else if (typeof e === 'object') {
        dst[i] = deepmerge(target[i], e);
      } else {
        if (target.indexOf(e) === -1) {
          dst.push(e);
        }
      }
    });
  } else {
    if (target && typeof target === 'object') {
      Object.keys(target).forEach((key) => {
        dst[key] = target[key];
      });
    }
    Object.keys(src as any).forEach((key) => {
      const v = (src as any)[key] as any;
      if (typeof v !== 'object' || !v) {
        dst[key] = v;
      } else {
        if (!target[key]) {
          dst[key] = v;
        } else {
          dst[key] = deepmerge(target[key], v);
        }
      }
    });
  }

  return dst;
}
