/* @flow */

import MissingType from '../type/missingType';
import compose from '../utils/compose';
import ArgsIsRequired from './middlewares/argsIsRequired';

import type {
  GraphQLArgumentConfig,
  GraphQLFieldConfigArgumentMap,
  ResolverMWResolveFn,
  GraphQLOutputType,
  ResolverMWMethodKeys,
  ResolverFieldConfig,
  ResolverMWArgs,
  ResolverMWResolve,
  ResolveParams,
  ResolverKinds,
} from '../definition.js';
import type { ResolverMiddleware } from './resolverMiddleware';

export type ResolverOpts = {
  outputType?: GraphQLOutputType,
  resolve?: ResolverMWResolveFn,
  args?: GraphQLFieldConfigArgumentMap,
  name?: string,
  kind?: ResolverKinds,
  description?: string,
};

export default class Resolver {
  middlewares: Array<ResolverMiddleware>;
  args: GraphQLFieldConfigArgumentMap;
  outputType: ?GraphQLOutputType;
  resolve: ResolverMWResolveFn;
  name: ?string;
  kind: ?ResolverKinds;
  description: ?string;

  constructor(opts: ResolverOpts = {}) {
    this.outputType = opts.outputType || null;
    this.middlewares = [];
    this.args = opts.args || {};
    this.name = opts.name || null;
    this.kind = opts.kind || null;
    this.description = opts.description || '';

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

  resolve(resolveParams: ResolveParams): Promise { // eslint-disable-line
    return Promise.resolve();
  }

  composeResolve(): ResolverMWResolveFn {
    const resolveMWs: ResolverMWResolve[] =
      this._getMiddlewaresByKey('resolve')
      .map(mv => mv.resolve);
    return compose(...resolveMWs)(this.resolve);
  }

  setResolve(resolve: ResolverMWResolveFn): void {
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
      resolve: (source, args, context, info) =>
        this.composeResolve()({ source, args, context, info }),
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

  getKind() {
    return this.kind;
  }

  getDescription() {
    return this.description;
  }
}
