import MissingType from '../type/missingType';
import {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLList,
  GraphQLScalarType,
  GraphQLNonNull
} from 'graphql';
import compose from '../utils/compose';

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
    this.args[argName] = this.wrapArg(argumentConfig);
  }

  removeArg(argName) {
    delete this.args[argName];
  }

  wrapArg(argConfig) {
    if (argConfig.hasOwnProperty('isRequired') && argConfig.isRequired) {
      if (!(argConfig.type instanceof GraphQLNonNull)) {
        argConfig.type = new GraphQLNonNull(argConfig.type); // eslint-disable-line
      }
    }

    return argConfig;
  }

  resolve(source, args, context, info) {
    return null;
  }

  composeResolve() {
    return compose(...this.middlewares)(this.resolve);
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
      args: this.args,
      resolve: this.composeResolve(),
    };
  }

  addMiddleware(middleware) {
    this.middlewares.push(middleware);
  }
}
