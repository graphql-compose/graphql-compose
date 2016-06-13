import MissingType from '../type/missingType';
import {
  GraphQLList,
  GraphQLNonNull,
} from 'graphql';
import compose from '../utils/compose';
import ArgsIsRequired from './middlewares/argsIsRequired';

export default class Resolver {
  constructor(outputTypeName, opts = {}) {
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

  hasArg(argName) {
    return this.args.hasOwnProperty(argName);
  }

  getArg(argName) {
    if (this.hasArg(argName)) {
      return this.args[argName];
    }

    return undefined;
  }

  setArg(argName, argumentConfig) {
    this.args[argName] = argumentConfig;
  }

  removeArg(argName) {
    delete this.args[argName];
  }

  composeArgs() {
    const argsMWs = this._getMiddlewaresByKey('args', [
      // add internal middleware, that wraps isRequired args with GraphQLNonNull
      new ArgsIsRequired(),
    ]);
    return compose(...argsMWs)(args => Object.assign({}, args, this.args))(this.args);
  }

  resolve(source, args, context, info) {
    return null;
  }

  composeResolve() {
    const resolveMWs = this._getMiddlewaresByKey('resolve');
    return compose(...resolveMWs)(this.resolve);
  }

  setStorage(storage) {
    this.storage = storage;
  }

  setResolve(resolve) {
    this.resolve = resolve;
  }

  wrapType(type) {
    if (this.isArray) {
      return new GraphQLList(type);
    }

    return type;
  }

  getOutputType() {
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
    return [...this.middlewares, ...internalMiddlewares]
      .filter(mw => mw.hasOwnProperty(key))
      .map(mw => mw[key]);
  }
}
