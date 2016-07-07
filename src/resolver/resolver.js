/* @flow */

import MissingType from '../type/missingType';
import compose from '../utils/compose';

import type {
  GraphQLArgumentConfig,
  GraphQLFieldConfigArgumentMap,
  GraphQLOutputType,
  ResolverMWMethodKeys,
  ResolverFieldConfig,
  ResolverMWArgs,
  ResolverMWResolve,
  ResolverMWResolveFn,
  ResolverMWOutputType,
  ResolveParams,
  ResolverKinds,
} from '../definition.js';
import TypeComposer from '../typeComposer';
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
  typeComposer: TypeComposer;

  constructor(typeComposer: TypeComposer, opts: ResolverOpts = {}) {
    if (!(typeComposer instanceof TypeComposer)) {
      throw Error('First argument for Resolver.constructor should be TypeComposer instance');
    }
    this.typeComposer = typeComposer;

    this.outputType = opts.outputType || null;
    this.middlewares = [];
    this.args = opts.args || {};
    this.name = opts.name || null;
    this.kind = opts.kind || null;
    this.description = opts.description || '';

    if (opts.resolve) {
      this.resolve = opts.resolve;
    }

    typeComposer.addResolver(this);
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
      this._getMiddlewaresByKey('args')
      .map(mw => mw.args);

    // return compose(...argsMWs)(args => Object.assign({}, args, this.args))(this.args);
    return compose(...argsMWs)(args => args)(this.args);
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

  composeOutputType(): GraphQLOutputType {
    const outputTypeMWs: ResolverMWOutputType[] =
      this._getMiddlewaresByKey('outputType')
      .map(mw => mw.outputType);

    return compose(...outputTypeMWs)(outputType => outputType)(this.getOutputType());
  }

  getFieldConfig(): ResolverFieldConfig {
    return {
      type: this.composeOutputType(),
      args: this.composeArgs(),
      resolve: (source, args, context, info) => {
        const projection = {}; // TODO
        return this.composeResolve()({ source, args, context, info, projection });
      },
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
    key: ResolverMWMethodKeys
  ) {
    return this.middlewares.filter(mw => mw.hasMethod(key));
  }

  getKind() {
    return this.kind;
  }

  getDescription() {
    return this.description;
  }

  clone(newTypeComposer: TypeComposer): Resolver {
    const opts = {};
    for (const key in this) {
      if (this.hasOwnProperty(key)) {
        // $FlowFixMe
        opts[key] = this[key];
      }
    }
    return new Resolver(newTypeComposer, opts);
  }

  getTypeComposer(): TypeComposer {
    return this.typeComposer;
  }
}
