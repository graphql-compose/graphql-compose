// @flow

import MissingType from '../type/missingType';
import {
  GraphQLList,
} from 'graphql';
import compose from '../utils/compose';
import ArgsIsRequired from './middlewares/argsIsRequired';

import type {
  GraphQLArgumentConfig,
  GraphQLFieldConfigArgumentMap,
  GraphQLFieldResolveFn,
  GraphQLOutputType,
  GraphQLResolveInfo,
  ResolverMiddlewareMethodKeys,
  ResolverFieldConfig,
  ResolverMiddlewareArgs,
  ResolverMiddlewareResolve,
} from '../definition.js';
import type ComposeStorage from '../storage';
import type { ResolverMiddleware } from './resolverMiddleware';

export type ResolverOpts = {
  resolve?: GraphQLFieldResolveFn,
  storage?: ComposeStorage,
  forceType?: GraphQLOutputType,
  isArray?: boolean,
};

export default class Resolver {
  middlewares: Array<ResolverMiddleware>;
  args: GraphQLFieldConfigArgumentMap;
  outputTypeName: string;
  resolve: GraphQLFieldResolveFn;
  storage: ComposeStorage;
  forceType: GraphQLOutputType;
  isArray: boolean;

  constructor(outputTypeName: string, opts: ResolverOpts = {}) {
    this.middlewares = [];
    this.args = {};
    this.outputTypeName = outputTypeName;
    this.isArray = false;

    if (opts.resolve) {
      this.resolve = opts.resolve;
    }

    if (opts.storage) {
      this.storage = opts.storage;
    }

    if (opts.forceType) {
      this.forceType = opts.forceType;
    }

    if (opts.isArray) {
      this.isArray = opts.isArray;
    }
  }

  hasArg(argName: string): boolean {
    return !!this.args[argName];
  }

  getArg(argName: string) {
    if (this.hasArg(argName)) {
      return this.args[argName];
    }


    return undefined;
  }

  setArg(argName: string, argConfig: GraphQLArgumentConfig) {
    this.args[argName] = argConfig;
  }

  removeArg(argName: string) {
    delete this.args[argName];
  }

  composeArgs():GraphQLFieldConfigArgumentMap {
    const argsMWs: ResolverMiddlewareArgs[] =
      this._getMiddlewaresByKey('args', [
        // add internal middleware, it wraps isRequired args with GraphQLNonNull
        new ArgsIsRequired(),
      ])
      .map(mw => mw.args);

    const composedMWs = compose(...argsMWs);
    return composedMWs(args => Object.assign({}, args, this.args))(this.args);
  }

  resolve(
    source: mixed,
    args: {[argName: string]: mixed},
    context: mixed,
    info: GraphQLResolveInfo // eslint-disable-line
  ): mixed {
    return null;
  }

  composeResolve(): GraphQLFieldResolveFn {
    const resolveMWs: ResolverMiddlewareResolve[] =
      this._getMiddlewaresByKey('resolve')
      .map(mv => mv.resolve);
    // (({ source, args, context, info }) => this.resolve(source, args, context, info))
    return compose(...resolveMWs);
  }

  setStorage(storage: ComposeStorage): void {
    this.storage = storage;
  }

  setResolve(resolve: GraphQLFieldResolveFn): void {
    this.resolve = resolve;
  }

  wrapType(type: GraphQLOutputType): GraphQLOutputType {
    if (this.isArray) {
      return new GraphQLList(type);
    }

    return type;
  }

  getOutputType(): GraphQLOutputType {
    if (this.forceType) {
      return this.forceType;
    }

    if (this.storage) {
      return this.wrapType(
        this.storage.getType(this.outputTypeName)
      );
    }

    return this.wrapType(MissingType);
  }


  getFieldConfig(): ResolverFieldConfig {
    return {
      type: this.getOutputType(),
      args: this.composeArgs(),
      resolve: this.composeResolve(),
    };
  }

  /**
   * You may pass one middleware or list of them:
   *   addMiddleware(M1)
   *   addMiddleware(M1, M2, ...)
   */
  addMiddleware(...middlewares: Array<ResolverMiddleware>) {
    this.middlewares.push(...middlewares);
  }

  _getMiddlewaresByKey(
    key: ResolverMiddlewareMethodKeys,
    internalMiddlewares:Array<ResolverMiddleware> = []
  ) {
    return [...internalMiddlewares, ...this.middlewares]
      .filter(mw => mw.hasMethod(key));
  }
}
