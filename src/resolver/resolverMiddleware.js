/* @flow */

import type {
  ObjectMap,
  ResolverMiddlewareArgs,
  ResolverMiddlewareResolve,
  ResolverMiddlewareMethodKeys,
} from '../definition';

export type ResolverMiddlewareMethods = {
  args: ResolverMiddlewareArgs,
  resolve: ResolverMiddlewareResolve,
};

export default class ResolverMiddleware {
  opts: ObjectMap;
  args: ResolverMiddlewareArgs;
  resolve: ResolverMiddlewareResolve;

  hasMethod(methodKey: ResolverMiddlewareMethodKeys) {
    const that:ResolverMiddlewareMethods = this;
    return this.hasOwnProperty(methodKey) && !!that[methodKey];
  }
}

export {
  ResolverMiddleware,
};
