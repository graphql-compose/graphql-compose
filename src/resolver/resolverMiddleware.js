/* @flow */

import type {
  ObjectMap,
  ResolverMWArgs,
  ResolverMWResolve,
  ResolverMWMethodKeys,
  ResolverMWOutputType,
} from '../definition';

import TypeComposer from '../typeComposer';
import Resolver from './resolver';

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
  typeResolver: Resolver;

  constructor(typeComposer: TypeComposer, typeResolver: Resolver, opts: ObjectMap = {}) {
    if (!(typeComposer instanceof TypeComposer)) {
      throw new Error('ResolverMiddleware.constructor(typeComposer, typeResolver, opts) '
                    + 'first argument must be instance of TypeComposer');
    }
    if (!(typeResolver instanceof Resolver)) {
      throw new Error('ResolverMiddleware.constructor(typeComposer, typeResolver, opts) '
                    + 'second argument must be instance of Resolver');
    }
    this.typeComposer = typeComposer;
    this.typeResolver = typeResolver;
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
