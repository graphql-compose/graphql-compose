/* @flow */

import type {
  ObjectMap,
  ResolverMWArgs,
  ResolverMWResolve,
  ResolverMWMethodKeys,
} from '../definition';

export type ResolverMWMethods = {
  args: ResolverMWArgs,
  resolve: ResolverMWResolve,
};

export default class ResolverMiddleware {
  opts: ObjectMap;
  args: ResolverMWArgs;
  resolve: ResolverMWResolve;

  hasMethod(methodKey: ResolverMWMethodKeys) {
    const that:ResolverMWMethods = this;
    return this.hasOwnProperty(methodKey) && !!that[methodKey];
  }
}

export {
  ResolverMiddleware,
};
