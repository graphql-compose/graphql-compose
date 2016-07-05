/* @flow */

import type {
  ObjectMap,
  ResolverMWArgs,
  ResolverMWResolve,
  ResolverMWMethodKeys,
  ResolverMWOutputType,
} from '../definition';

import TypeComposer from '../typeComposer';

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
  typeComposer: TypeComposer;

  constructor(typeComposer: TypeComposer, opts: ObjectMap = {}) {
    if (!(typeComposer instanceof TypeComposer)) {
      throw new Error('ResolverMiddleware.constructor(tc, opts) '
                    + 'first argument must be instance of TypeComposer');
    }
    this.typeComposer = typeComposer;
    this.opts = opts;
  }

  hasMethod(methodKey: ResolverMWMethodKeys) {
    const that:ResolverMWMethods = this;
    return this.hasOwnProperty(methodKey) && !!that[methodKey];
  }
}

export {
  ResolverMiddleware,
};
