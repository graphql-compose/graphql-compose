// @flow

import MissingType from '../type/missingType';
import {
  GraphQLList,
} from 'graphql';
import type {
  GraphQLArgumentConfig,
  GraphQLFieldConfigArgumentMap,
  GraphQLFieldResolveFn,
  GraphQLOutputType,
  GraphQLResolveInfo,
} from 'graphql/type/definition.js';
import compose from '../utils/compose';
import ArgsIsRequired from './middlewares/argsIsRequired';

export default class Resolver {
  middlewares: Array<mixed>;
  args: GraphQLFieldConfigArgumentMap;
  outputTypeName: string;
  resolve: GraphQLFieldResolveFn;
  storage: mixed;
  forceType: GraphQLOutputType;
  isArray: boolean;

  constructor(outputTypeName: string, opts: Object = {}) {
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

    if (opts.type) {
      this.forceType = opts.type;
    }

    if (opts.isArray) {
      this.isArray = opts.isArray;
    }
  }

  hasArg(argName: string): boolean {
    return this.args.hasOwnProperty(argName);
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

  composeArgs() {
    const argsMWs = this._getMiddlewaresByKey('args', [
      // add internal middleware, that wraps isRequired args with GraphQLNonNull
      new ArgsIsRequired(),
    ]);
    return compose(...argsMWs)(args => Object.assign({}, args, this.args))(this.args);
  }

  resolve(
    source: mixed,
    args: {[argName: string]: mixed},
    context: mixed,
    info: GraphQLResolveInfo // eslint-disable-line
  ) {
    return null;
  }

  composeResolve(): GraphQLFieldResolveFn {
    const resolveMWs = this._getMiddlewaresByKey('resolve');
    return compose(...resolveMWs)(this.resolve);
  }

  setStorage(storage): void {
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

  getFieldConfig() {
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
  addMiddleware(...middlewares) {
    this.middlewares.push(...middlewares);
  }

  _getMiddlewaresByKey(key, internalMiddlewares = []) {
    return [...internalMiddlewares, ...this.middlewares]
      .filter(mw => mw.hasOwnProperty(key))
      .map(mw => mw[key]);
  }
}
