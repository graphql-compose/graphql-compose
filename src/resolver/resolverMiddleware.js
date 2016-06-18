/* @flow */

import type {
  ObjectMap,
  ResolverMWArgs,
  ResolverMWResolve,
  ResolverMWMethodKeys,
  ResolverMWOutputType,
} from '../definition';

export type ResolverMWMethods = {
  outputType: ResolverMWOutputType,
  args: ResolverMWArgs,
  resolve: ResolverMWResolve,
};

export default class ResolverMiddleware {
  opts: ObjectMap;
  outputType: ResolverMWOutputType;
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
