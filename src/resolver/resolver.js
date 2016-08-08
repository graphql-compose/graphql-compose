/* @flow */

import MissingType from '../type/missingType';
import compose from '../utils/compose';
import deepmerge from '../utils/deepmerge';
import { upperFirst } from '../utils/misc';
import { getProjectionFromAST } from '../projection';

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
  ObjectMap,
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
  name: string;
  kind: ?ResolverKinds;
  description: ?string;
  typeComposer: TypeComposer;

  constructor(typeComposer: TypeComposer, opts: ResolverOpts = {}) {
    if (!(typeComposer instanceof TypeComposer)) {
      throw Error('First argument for Resolver.constructor should be TypeComposer instance');
    }
    this.typeComposer = typeComposer;

    if (!opts.name) {
      throw Error('For Resolver constructor the `opts.name` is required option.');
    }
    this.name = opts.name;

    this.outputType = opts.outputType || null;
    this.middlewares = [];
    this.args = opts.args || {};
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

  /*
  * This method should be overriden via constructor
  */
  resolve(resolveParams: ResolveParams): Promise<any> { // eslint-disable-line
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

  getFieldConfig(
    opts: {
      projection?: ObjectMap,
    } = {}
  ): ResolverFieldConfig {
    const resolve = this.composeResolve();
    return {
      type: this.composeOutputType(),
      args: this.composeArgs(),
      resolve: (source, args, context, info) => {
        let projection = getProjectionFromAST(info);
        if (opts.projection) {
          projection = deepmerge(projection, opts.projection);
        }
        return resolve({ source, args, context, info, projection });
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

  clone(newTypeComposer: TypeComposer, opts: ObjectMap = {}): Resolver {
    const oldOpts = {};
    for (const key in this) {
      if (this.hasOwnProperty(key)) {
        // $FlowFixMe
        oldOpts[key] = this[key];
      }
    }
    return new Resolver(newTypeComposer, Object.assign({}, oldOpts, opts));
  }

  getTypeComposer(): TypeComposer {
    return this.typeComposer;
  }

  getNameCamelCase(): string {
    return upperFirst(this.name);
  }
}
