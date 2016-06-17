/* @flow */

import MissingType from '../type/missingType';
import compose from '../utils/compose';
import ArgsIsRequired from './middlewares/argsIsRequired';

import type {
  GraphQLArgumentConfig,
  GraphQLFieldConfigArgumentMap,
  GraphQLFieldResolveFn,
  GraphQLOutputType,
  ResolverMWMethodKeys,
  ResolverFieldConfig,
  ResolverMWArgs,
  ResolverMWResolve,
  ResolveParams,
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
  outputType: GraphQLOutputType;
  resolve: GraphQLFieldResolveFn;

  constructor(outputType: GraphQLOutputType, opts: ResolverOpts = {}) {
    this.outputType = outputType;
    this.middlewares = [];
    this.args = {};

    if (opts.resolve) {
      this.resolve = opts.resolve;
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
    const argsMWs: ResolverMWArgs[] =
      this._getMiddlewaresByKey('args', [
        // add internal middleware, it wraps isRequired args with GraphQLNonNull
        new ArgsIsRequired(),
      ])
      .map(mw => mw.args);

    const composedMWs = compose(...argsMWs);
    return composedMWs(args => Object.assign({}, args, this.args))(this.args);
  }

  resolve(resolveParams: ResolveParams): mixed { // eslint-disable-line
    return null;
  }

  composeResolve(): GraphQLFieldResolveFn {
    const resolveMWs: ResolverMWResolve[] =
      this._getMiddlewaresByKey('resolve')
      .map(mv => mv.resolve);
    return compose(...resolveMWs)(this.resolve);
  }

  setResolve(resolve: GraphQLFieldResolveFn): void {
    this.resolve = resolve;
  }

  getOutputType(): GraphQLOutputType {
    if (this.outputType) {
      return this.outputType;
    }

    return MissingType;
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
    key: ResolverMWMethodKeys,
    internalMiddlewares:Array<ResolverMiddleware> = []
  ) {
    return [...internalMiddlewares, ...this.middlewares]
      .filter(mw => mw.hasMethod(key));
  }
}
