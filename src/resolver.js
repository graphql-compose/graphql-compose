/* @flow */
/* eslint-disable no-use-before-define */

import objectPath from 'object-path';
import util from 'util';
import {
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLEnumType,
  isOutputType,
} from 'graphql';
import TypeMapper from './typeMapper';
import TypeComposer from './typeComposer';
import deepmerge from './utils/deepmerge';
import { only } from './utils/misc';
import { isFunction, isString } from './utils/is';
import { getProjectionFromAST } from './projection';
import type {
  GraphQLArgumentConfig,
  GraphQLFieldConfigArgumentMap,
  GraphQLOutputType,
  ResolverFieldConfig,
  ResolverMWResolve,
  ResolverMWResolveFn,
  ResolveParams,
  ResolverKinds,
  ProjectionType,
  ResolverFilterArgConfig,
  ResolverSortArgConfig,
  ResolverOpts,
  ResolverWrapFn,
  ResolverWrapArgsFn,
  ResolverWrapOutputTypeFn,
  GraphQLInputType,
} from './definition';
import InputTypeComposer from './inputTypeComposer';
import { typeByPath } from './typeByPath';


export default class Resolver {
  outputType: GraphQLOutputType;
  args: GraphQLFieldConfigArgumentMap;
  resolve: ResolverMWResolveFn;
  name: string;
  kind: ?ResolverKinds;
  description: ?string;
  parent: ?Resolver;

  constructor(opts: ResolverOpts = {}) {
    if (!opts.name) {
      throw new Error('For Resolver constructor the `opts.name` is required option.');
    }
    this.name = opts.name;
    this.parent = opts.parent || null;
    this.kind = opts.kind || null;
    this.description = opts.description || '';

    if (opts.outputType) {
      this.setOutputType(opts.outputType);
    }

    if (opts.args) {
      this.args = TypeMapper.convertArgConfigMap(opts.args, this.name, 'Resolver');
    } else {
      this.args = {};
    }

    if (opts.resolve) {
      this.resolve = opts.resolve;
    }
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

  getArgType(argName: string): GraphQLInputType | void {
    const arg = this.getArg(argName);
    if (arg) {
      return arg.type;
    }
    return undefined;
  }

  getArgs(): GraphQLFieldConfigArgumentMap {
    return this.args;
  }

  setArgs(args: GraphQLFieldConfigArgumentMap): void {
    this.args = TypeMapper.convertArgConfigMap(args, this.name, 'Resolver');
  }

  setArg(argName: string, argConfig: GraphQLArgumentConfig) {
    this.args[argName] = TypeMapper.convertArgConfig(argConfig, argName, this.name, 'Resolver');
  }

  addArgs(newArgs: GraphQLFieldConfigArgumentMap) {
    this.setArgs(Object.assign({}, this.getArgs(), newArgs));
  }

  removeArg(argName: string) {
    delete this.args[argName];
  }

  isRequired(argName: string): boolean {
    return this.getArgType(argName) instanceof GraphQLNonNull;
  }

  makeRequired(argNameOrArray: string | Array<string>) {
    const argNames = Array.isArray(argNameOrArray) ? argNameOrArray : [argNameOrArray];
    const args = this.getArgs();
    argNames.forEach((argName) => {
      if (args[argName]) {
        if (!(args[argName].type instanceof GraphQLNonNull)) {
          args[argName].type = new GraphQLNonNull(args[argName].type);
        }
      }
    });
    this.setArgs(args);
  }

  makeOptional(argNameOrArray: string | Array<string>) {
    const argNames = Array.isArray(argNameOrArray) ? argNameOrArray : [argNameOrArray];
    const args = this.getArgs();
    argNames.forEach((argName) => {
      if (argNames.includes(argName)) {
        if (args[argName].type instanceof GraphQLNonNull) {
          args[argName].type = args[argName].type.ofType;
        }
      }
    });
    this.setArgs(args);
  }

  /*
  * This method should be overriden via constructor
  */
  resolve(resolveParams: ResolveParams): Promise<any> { // eslint-disable-line
    return Promise.resolve();
  }

  getResolve():ResolverMWResolveFn {
    return this.resolve;
  }

  setResolve(resolve: ResolverMWResolveFn): void {
    this.resolve = resolve;
  }

  getOutputType(): GraphQLOutputType {
    return this.outputType;
  }

  setOutputType(gqType: GraphQLOutputType | string) {
    let type;

    if (gqType instanceof TypeComposer) {
      this.outputType = gqType.getType();
      return;
    }

    if (gqType instanceof Resolver) {
      this.outputType = gqType.getOutputType();
      return;
    }

    if (gqType instanceof InputTypeComposer) {
      throw new Error('You provide InputTypeComposer as OutputType for Resolver.outputType. It may by ScalarType or OutputObjectType.');
    }

    if (isString(gqType)) {
      // $FlowFixMe
      if (gqType.indexOf('{') === -1) {
        // $FlowFixMe
        type = TypeMapper.getWrapped(gqType);
      } else {
        // $FlowFixMe
        type = TypeMapper.createType(gqType);
      }
    } else {
      type = gqType;
    }

    // $FlowFixMe
    if (!isOutputType(type)) {
      throw new Error('You should provide correct OutputType for Resolver.outputType.');
    }
    // $FlowFixMe
    this.outputType = type;
  }

  getFieldConfig(
    opts: {
      projection?: ProjectionType,
    } = {}
  ): ResolverFieldConfig {
    const resolve = this.getResolve();
    return {
      type: this.getOutputType(),
      args: this.getArgs(),
      description: this.description,
      resolve: (source, args, context, info) => {
        let projection = getProjectionFromAST(info);
        if (opts.projection) {
          projection = deepmerge(projection, opts.projection);
        }
        return resolve({ source, args, context, info, projection });
      },
    };
  }

  getKind(): ?ResolverKinds {
    return this.kind;
  }

  setKind(kind: string) {
    if (kind !== 'query' && kind !== 'mutation' && kind !== 'subscription') {
      throw new Error(`You provide incorrect value '${kind}' for Resolver.setKind method. `
                    + 'Valid values are: query | mutation | subscription');
    }
    this.kind = kind;
  }

  getDescription(): ?string {
    return this.description;
  }

  setDescription(description: string) {
    this.description = description;
  }

  get(path: string | Array<string>): mixed {
    return typeByPath(this, path);
  }

  clone(opts: ResolverOpts = {}): Resolver {
    const oldOpts = {};
    for (const key in this) { // eslint-disable-line no-restricted-syntax
      if ({}.hasOwnProperty.call(this, key)) {
        // $FlowFixMe
        oldOpts[key] = this[key];
      }
    }
    oldOpts.args = Object.assign({}, this.args);
    return new Resolver(Object.assign({}, oldOpts, opts));
  }

  wrap(cb: ?ResolverWrapFn, opts: ?ResolverOpts = {}): Resolver {
    const prevResolver = this;
    const newResolver = this.clone({
      name: 'wrap',
      parent: prevResolver,
      ...opts,
    });

    if (isFunction(cb)) {
      // $FlowFixMe
      cb(newResolver, prevResolver);
    }

    return newResolver;
  }

  wrapResolve(cb: ResolverMWResolve, wrapperName: string = 'wrapResolve'): Resolver {
    return this.wrap(
      (newResolver, prevResolver) => {
        const newResolve = cb(prevResolver.getResolve());
        newResolver.setResolve(newResolve);
        return newResolver;
      },
      { name: wrapperName }
    );
  }

  wrapArgs(cb: ResolverWrapArgsFn, wrapperName: string = 'wrapArgs'): Resolver {
    return this.wrap(
      (newResolver, prevResolver) => {
        // clone prevArgs, to avoid changing args in callback
        const prevArgs = Object.assign({}, prevResolver.getArgs());
        const newArgs = cb(prevArgs);
        newResolver.setArgs(newArgs);
        return newResolver;
      },
      { name: wrapperName }
    );
  }

  wrapOutputType(cb: ResolverWrapOutputTypeFn, wrapperName: string = 'wrapOutputType'): Resolver {
    return this.wrap(
      (newResolver, prevResolver) => {
        const prevOutputType = prevResolver.getOutputType();
        const newOutputType = cb(prevOutputType);
        newResolver.setOutputType(newOutputType);
        return newResolver;
      },
      { name: wrapperName }
    );
  }

  addFilterArg(opts: ResolverFilterArgConfig): Resolver {
    if (!opts.name) {
      throw new Error('For Resolver.addFilterArg the arg name `opts.name` is required.');
    }

    if (!opts.type) {
      throw new Error('For Resolver.addFilterArg the arg type `opts.type` is required.');
    }

    const resolver = this.wrap(null, { name: 'addFilterArg' });

    // get filterTC or create new one argument
    const filter = resolver.getArg('filter');
    let filterITC;
    if (filter && filter.type instanceof GraphQLInputObjectType) {
      filterITC = new InputTypeComposer(filter.type);
    } else {
      if (!opts.filterTypeNameFallback || !isString(opts.filterTypeNameFallback)) {
        throw new Error('For Resolver.addFilterArg needs to provide `opts.filterTypeNameFallback: string`. '
                      + 'This string will be used as unique name for `filter` type of input argument. '
                      + 'Eg. FilterXXXXXInput');
      }
      filterITC = InputTypeComposer.create(opts.filterTypeNameFallback);
    }

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

    filterITC.setField(opts.name, {
      ...only(opts, ['name', 'type', 'defaultValue', 'description']),
    });

    const resolveNext = resolver.getResolve();
    if (isFunction(opts.query)) {
      resolver.setResolve((resolveParams: ResolveParams) => {
        const value = objectPath.get(resolveParams, ['args', 'filter', opts.name]);
        if (value) {
          if (!resolveParams.rawQuery) {
            resolveParams.rawQuery = {}; // eslint-disable-line
          }
          opts.query(resolveParams.rawQuery, value, resolveParams);
        }
        return resolveNext(resolveParams);
      });
    }

    return resolver;
  }

  addSortArg(opts: ResolverSortArgConfig): Resolver {
    if (!opts.name) {
      throw new Error('For Resolver.addSortArg the `opts.name` is required.');
    }

    if (!opts.value) {
      throw new Error('For Resolver.addSortArg the `opts.value` is required.');
    }

    const resolver = this.wrap(null, { name: 'addSortArg' });

    // get sortEnumType or create new one
    const sort = resolver.getArg('sort');
    let sortEnumType;
    if (sort) {
      if (sort.type instanceof GraphQLEnumType) {
        sortEnumType = sort.type;
      } else {
        throw new Error('Resolver should have `sort` arg with type GraphQLEnumType. '
                      + `But got: ${util.inspect(sort.type, { depth: 2 })} `);
      }
    } else {
      if (!opts.sortTypeNameFallback || !isString(opts.sortTypeNameFallback)) {
        throw new Error('For Resolver.addSortArg needs to provide `opts.sortTypeNameFallback: string`. '
                      + 'This string will be used as unique name for `sort` type of input argument. '
                      + 'Eg. SortXXXXXEnum');
      }
      sortEnumType = new GraphQLEnumType({
        name: opts.sortTypeNameFallback,
        values: {
          [opts.name]: {},
        },
      });
      resolver.setArg('sort', { type: sortEnumType });
    }

    // extend sortEnumType with new sorting value
    const existedIdx = sortEnumType._values.findIndex(o => o.name === opts.name);
    if (existedIdx >= 0) {
      sortEnumType._values.splice(existedIdx, 1);
    }
    delete sortEnumType._nameLookup;
    delete sortEnumType._valueLookup;
    sortEnumType._values.push({
      name: opts.name,
      description: opts.description,
      isDeprecated: Boolean(opts.deprecationReason),
      deprecationReason: opts.deprecationReason,
      value: isFunction(opts.value) ? opts.name : opts.value,
    });

    // If sort value is evaluable (function), then wrap resolve method
    const resolveNext = resolver.getResolve();
    if (isFunction(opts.value)) {
      resolver.setResolve((resolveParams: ResolveParams) => {
        const value = objectPath.get(resolveParams, ['args', 'sort']);
        if (value === opts.name) {
          // $FlowFixMe
          const newSortValue = opts.value(resolveParams);
          resolveParams.args.sort = newSortValue; // eslint-disable-line
        }
        return resolveNext(resolveParams);
      });
    }

    return resolver;
  }

  getNestedName() {
    if (this.parent) {
      return `${this.name}(${this.parent.getNestedName()})`;
    }
    return this.name;
  }

  toString() {
    function extendedInfo(resolver, spaces = '') {
      return [
        'Resolver(',
        `  name: ${resolver.name},`,
        `  outputType: ${util.inspect(resolver.outputType, { depth: 2 })},`,
        `  args: ${util.inspect(resolver.args, { depth: 3 }).replace('\n', `\n  ${spaces}`)},`,
        `  resolve: ${resolver.resolve ? resolver.resolve.toString().replace('\n', `\n  ${spaces}`) : 'undefined'},`,
        `  parent: ${resolver.parent ? extendedInfo(resolver.parent, `  ${spaces}`) : ''}`,
        ')',
      ].filter(s => !!s).join(`\n  ${spaces}`);
    }

    return extendedInfo(this);
  }
}
