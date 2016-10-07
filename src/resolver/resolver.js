/* @flow */

import objectPath from 'object-path';
import { GraphQLInputObjectType } from 'graphql';
import MissingType from '../type/missingType';
import compose from '../utils/compose';
import deepmerge from '../utils/deepmerge';
import { upperFirst, clearName, only } from '../utils/misc';
import { isFunction, isObject } from '../utils/is';
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
  ProjectionType,
  ResolverFilterArgConfig,
} from '../definition';
import TypeComposer from '../typeComposer';
import InputTypeComposer from '../inputTypeComposer';
import type { ResolverMiddleware } from './resolverMiddleware';

export type ResolverOpts = {
  outputType?: GraphQLOutputType,
  resolve?: ResolverMWResolveFn,
  args?: GraphQLFieldConfigArgumentMap,
  name?: string,
  kind?: ResolverKinds,
  description?: string,
  middlewares?: Array<ResolverMiddleware> | [],
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
      throw new Error('First argument for Resolver.constructor should be TypeComposer instance');
    }
    this.typeComposer = typeComposer;

    if (!opts.name) {
      throw new Error('For Resolver constructor the `opts.name` is required option.');
    }
    this.name = opts.name;

    this.outputType = opts.outputType || null;
    this.middlewares = opts.middlewares || [];
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

  getArg(argName: string): ?GraphQLArgumentConfig {
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

  getResolve():ResolverMWResolveFn {
    return this.resolve;
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
      projection?: ProjectionType,
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
    for (const key in this) { // eslint-disable-line no-restricted-syntax
      if ({}.hasOwnProperty.call(this, key)) {
        // $FlowFixMe
        if (isObject(this[key])) {
          oldOpts[key] = Object.assign({}, this[key]);
        } else {
          oldOpts[key] = this[key];
        }
      }
    }
    return new Resolver(newTypeComposer, Object.assign({}, oldOpts, opts));
  }

  cloneWithWrap(wrapperName: string = 'wrapped'): Resolver {
    return this.clone(
      this.typeComposer,
      // IMPORTANT to give new name for Resolver
      // otherwise original resolver, will be overwrited in TypeComposer
      { name: `${wrapperName}(${this.name})` }
    );
  }

  getTypeComposer(): TypeComposer {
    return this.typeComposer;
  }

  getNameCamelCase(): string {
    return upperFirst(this.name);
  }

  wrapResolve(resolveMW: ResolverMWResolve, wrapperName: string = 'wrapResolve'): Resolver {
    const newResolver = this.cloneWithWrap(wrapperName);
    newResolver.setResolve(
      resolveMW(this.getResolve())
    );
    return newResolver;
  }

  addFilterArg(opts: ResolverFilterArgConfig): Resolver {
    if (!opts.name) {
      throw new Error('For Resolver.addFilterArg the arg name `opts.name` is required.');
    }

    if (!opts.type) {
      throw new Error('For Resolver.addFilterArg the arg type `opts.type` is required.');
    }

    const resolver = this.cloneWithWrap(`addFilterArg[${opts.name}]`);

    // get filterTC or create new one argument
    const filter = resolver.getArg('filter');
    const filterITC = filter && filter.type instanceof GraphQLInputObjectType
      ? new InputTypeComposer(filter.type)
      : InputTypeComposer.create(
        `Filter${upperFirst(clearName(this.name))}${this.typeComposer.getTypeName()}Input`
      );

    let defaultValue;
    if (filter && filter.defaultValue) {
      defaultValue = filter.defaultValue;
    }
    if (opts.defaultValue) {
      if (!defaultValue) {
        defaultValue = {};
      }
      // $FlowFixMe
      defaultValue[opts.name] = opts.defaultValue;
    }

    resolver.setArg('filter', {
      type: filterITC.getType(),
      description: (filter && filter.description) || undefined,
      defaultValue,
    });

    filterITC.addField(opts.name, {
      ...only(opts, ['name', 'type', 'defaultValue', 'description']),
    });

    const resolve = resolver.getResolve();
    if (isFunction(opts.query)) {
      resolver.setResolve((resolveParams: ResolveParams) => {
        const value = objectPath.get(resolveParams, ['args', 'filter', opts.name]);
        if (value) {
          if (!resolveParams.rawQuery) {
            resolveParams.rawQuery = {}; // eslint-disable-line
          }
          opts.query(resolveParams.rawQuery, value, resolveParams);
        }
        return resolve(resolveParams);
      });
    }

    return resolver;
  }
}
