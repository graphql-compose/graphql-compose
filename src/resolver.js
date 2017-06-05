/* @flow */
/* eslint-disable no-use-before-define, no-restricted-syntax */

import objectPath from 'object-path';
import util from 'util';
import {
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLEnumType,
  GraphQLObjectType,
  isOutputType,
  isInputType,
} from 'graphql';
import { deprecate } from './utils/debug';
import TypeMapper from './typeMapper';
import TypeComposer from './typeComposer';
import deepmerge from './utils/deepmerge';
import { resolveInputConfigsAsThunk } from './utils/configAsThunk';
import { only, clearName } from './utils/misc';
import { isFunction, isString } from './utils/is';
import { getProjectionFromAST } from './projection';
import type {
  GraphQLArgumentConfig,
  GraphQLFieldConfigArgumentMap,
  GraphQLOutputType,
  GraphQLFieldConfig,
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
  ResolverWrapTypeFn,
  GraphQLInputType,
  TypeDefinitionString,
  ComposeOutputType,
  ComposeArgumentConfig,
  ComposeFieldConfigArgumentMap,
  TypeNameString,
} from './definition';
import InputTypeComposer from './inputTypeComposer';
import { typeByPath } from './typeByPath';

export default class Resolver<TSource, TContext> {
  type: GraphQLOutputType;
  args: GraphQLFieldConfigArgumentMap;
  resolve: ResolverMWResolveFn<TSource, TContext>;
  name: string;
  kind: ?ResolverKinds;
  description: ?string;
  parent: ?Resolver<TSource, TContext>;

  constructor(opts: ResolverOpts<TSource, TContext>) {
    if (!opts.name) {
      throw new Error('For Resolver constructor the `opts.name` is required option.');
    }
    this.name = opts.name;
    this.parent = opts.parent || null;
    this.kind = opts.kind || null;
    this.description = opts.description || '';

    /**
    * @deprecated 2.0.0
    */
    if (opts.outputType) {
      deprecate('Use opts.type instead.');
      // $FlowFixMe
      this.setType(opts.outputType);
    }

    if (opts.type) {
      this.setType(opts.type);
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

  getArgNames(): string[] {
    return Object.keys(this.args);
  }

  setArgs(
    args: ComposeFieldConfigArgumentMap
  ): Resolver<TSource, TContext> {
    this.args = TypeMapper.convertArgConfigMap(args, this.name, 'Resolver');
    return this;
  }

  setArg(
    argName: string,
    argConfig: ComposeArgumentConfig
  ): Resolver<TSource, TContext> {
    this.args[argName] = TypeMapper.convertArgConfig(argConfig, argName, this.name, 'Resolver');
    return this;
  }

  addArgs(
    newArgs: ComposeFieldConfigArgumentMap
  ): Resolver<TSource, TContext> {
    this.setArgs({ ...this.getArgs(), ...newArgs });
    return this;
  }

  removeArg(argNameOrArray: string | Array<string>): Resolver<TSource, TContext> {
    const argNames = Array.isArray(argNameOrArray) ? argNameOrArray : [argNameOrArray];
    argNames.forEach(argName => {
      delete this.args[argName];
    });
    return this;
  }

  removeOtherArgs(argNameOrArray: string | Array<string>): Resolver<TSource, TContext> {
    const keepArgNames = Array.isArray(argNameOrArray) ? argNameOrArray : [argNameOrArray];
    Object.keys(this.args).forEach(argName => {
      if (!keepArgNames.includes(argName)) {
        delete this.args[argName];
      }
    });
    return this;
  }

  reorderArgs(names: string[]): Resolver<TSource, TContext> {
    const orderedArgs = {};
    names.forEach(name => {
      if (this.args[name]) {
        orderedArgs[name] = this.args[name];
        delete this.args[name];
      }
    });
    this.args = { ...orderedArgs, ...this.args };
    return this;
  }

  cloneArg(argName: string, newTypeName: string): Resolver<TSource, TContext> {
    if (!{}.hasOwnProperty.call(this.args, argName)) {
      throw new Error(
        `Can not clone arg ${argName} for resolver ${this.name}. Argument does not exist.`
      );
    }
    if (!(this.args[argName].type instanceof GraphQLInputObjectType)) {
      throw new Error(
        `Can not clone arg ${argName} for resolver ${this.name}.` +
          'Argument should be GraphQLInputObjectType (complex input type).'
      );
    }
    if (!newTypeName || newTypeName !== clearName(newTypeName)) {
      throw new Error('You should provide new type name as second argument');
    }
    if (newTypeName === this.args[argName].type.name) {
      throw new Error('You should provide new type name. It is equal to current name.');
    }

    this.args[argName] = {
      ...this.args[argName],
      type: InputTypeComposer.create(this.args[argName].type).clone(newTypeName).getType(),
    };
    return this;
  }

  isRequired(argName: string): boolean {
    return this.getArgType(argName) instanceof GraphQLNonNull;
  }

  makeRequired(argNameOrArray: string | Array<string>): Resolver<TSource, TContext> {
    const argNames = Array.isArray(argNameOrArray) ? argNameOrArray : [argNameOrArray];
    argNames.forEach(argName => {
      if (this.args[argName]) {
        const argType = this.args[argName].type;
        if (!isInputType(argType)) {
          throw new Error(
            `Cannot make argument ${argName} required. It should be InputType: ${JSON.stringify(argType)}`
          );
        }
        if (!(argType instanceof GraphQLNonNull)) {
          this.args[argName].type = new GraphQLNonNull(argType);
        }
      }
    });
    return this;
  }

  makeOptional(argNameOrArray: string | Array<string>): Resolver<TSource, TContext> {
    const argNames = Array.isArray(argNameOrArray) ? argNameOrArray : [argNameOrArray];
    argNames.forEach(argName => {
      if (argNames.includes(argName)) {
        const argType = this.args[argName].type;
        if (argType instanceof GraphQLNonNull) {
          this.args[argName].type = argType.ofType;
        }
      }
    });
    return this;
  }

  /*
  * This method should be overriden via constructor
  */
  /* eslint-disable */
  resolve(
    resolveParams: ResolveParams<TSource, TContext> | $Shape<ResolveParams<TSource, TContext>>
  ): Promise<any> {
    return Promise.resolve();
  }
  /* eslint-enable */

  getResolve(): ResolverMWResolveFn<TSource, TContext> {
    return this.resolve;
  }

  setResolve(resolve: ResolverMWResolveFn<TSource, TContext>): Resolver<TSource, TContext> {
    this.resolve = resolve;
    return this;
  }

  /**
  * @deprecated 2.0.0
  */
  getOutputType(): GraphQLOutputType {
    deprecate('Use Resolver.getType() instead.');
    return this.getType();
  }

  /**
  * @deprecated 2.0.0
  */
  setOutputType(
    gqType:
      | GraphQLOutputType
      | TypeDefinitionString
      | TypeNameString
      | TypeComposer
      | Resolver<TSource, TContext>
  ) {
    deprecate('Use Resolver.setType() instead.');
    this.setType(gqType);
  }

  /**
  * @deprecated 2.0.0
  */
  wrapOutputType(
    cb: ResolverWrapTypeFn,
    wrapperName: string = 'wrapType'
  ): Resolver<TSource, TContext> {
    deprecate('Use Resolver.wrapType() instead.');
    return this.wrapType(cb, wrapperName);
  }

  /**
  * @deprecated 2.0.0
  */
  get outputType(): GraphQLOutputType {
    deprecate('Use Resolver.getType() instead.');
    return this.type;
  }

  /**
  * @deprecated 2.0.0
  */
  set outputType(gqType: GraphQLOutputType) {
    deprecate('Use Resolver.setType() instead.');
    this.type = gqType;
  }

  getType(): GraphQLOutputType {
    return this.type;
  }

  getTypeComposer(): ?TypeComposer {
    if (this.type instanceof GraphQLObjectType) {
      return new TypeComposer(this.type);
    }
    return null;
  }

  setType(gqType: ComposeOutputType<TSource, TContext>): Resolver<TSource, TContext> {
    const fc = TypeMapper.convertOutputFieldConfig(gqType, 'setType', 'Resolver');

    if (!fc || !isOutputType(fc.type)) {
      throw new Error('You should provide correct OutputType for Resolver.type.');
    }
    this.type = fc.type;
    return this;
  }

  getFieldConfig(
    opts: {
      projection?: ProjectionType,
    } = {}
  ): GraphQLFieldConfig<TSource, TContext> {
    const resolve = this.getResolve();
    return {
      type: this.getType(),
      args: resolveInputConfigsAsThunk(this.getArgs()),
      description: this.description,
      resolve: (source, args, context, info) => {
        let projection = getProjectionFromAST(info);
        if (opts.projection) {
          projection = ((deepmerge(projection, opts.projection): any): ProjectionType);
        }
        return resolve({ source, args, context, info, projection });
      },
    };
  }

  getKind(): ?ResolverKinds {
    return this.kind;
  }

  setKind(kind: string): Resolver<TSource, TContext> {
    if (kind !== 'query' && kind !== 'mutation' && kind !== 'subscription') {
      throw new Error(
        `You provide incorrect value '${kind}' for Resolver.setKind method. ` +
          'Valid values are: query | mutation | subscription'
      );
    }
    this.kind = kind;
    return this;
  }

  getDescription(): ?string {
    return this.description;
  }

  setDescription(description: string): Resolver<TSource, TContext> {
    this.description = description;
    return this;
  }

  get(path: string | Array<string>): any {
    // $FlowFixMe
    return typeByPath(this, path);
  }

  clone(opts: ResolverOpts<TSource, TContext> = {}): Resolver<TSource, TContext> {
    const oldOpts = {};
    for (const key in this) {
      if ({}.hasOwnProperty.call(this, key)) {
        // $FlowFixMe
        oldOpts[key] = this[key];
      }
    }
    oldOpts.args = { ...this.args };
    return new Resolver({ ...oldOpts, ...opts });
  }

  wrap(
    cb: ?ResolverWrapFn<TSource, TContext>,
    newResolverOpts: ?ResolverOpts<TSource, TContext> = {}
  ): Resolver<TSource, TContext> {
    const prevResolver: Resolver<TSource, TContext> = this;
    const newResolver = this.clone({
      name: 'wrap',
      parent: prevResolver,
      ...newResolverOpts,
    });

    if (isFunction(cb)) {
      cb(newResolver, prevResolver);
    }

    return newResolver;
  }

  wrapResolve(
    cb: ResolverMWResolve<TSource, TContext>,
    wrapperName: string = 'wrapResolve'
  ): Resolver<TSource, TContext> {
    return this.wrap(
      (newResolver, prevResolver) => {
        const newResolve = cb(prevResolver.getResolve());
        newResolver.setResolve(newResolve);
        return newResolver;
      },
      { name: wrapperName }
    );
  }

  wrapArgs(cb: ResolverWrapArgsFn, wrapperName: string = 'wrapArgs'): Resolver<TSource, TContext> {
    return this.wrap(
      (newResolver, prevResolver) => {
        // clone prevArgs, to avoid changing args in callback
        const prevArgs = { ...prevResolver.getArgs() };
        const newArgs = cb(prevArgs);
        newResolver.setArgs(newArgs);
        return newResolver;
      },
      { name: wrapperName }
    );
  }

  wrapCloneArg(argName: string, newTypeName: string): Resolver<TSource, TContext> {
    return this.wrap(
      newResolver => {
        newResolver.cloneArg(argName, newTypeName);
        return newResolver;
      },
      { name: 'cloneFilterArg' }
    );
  }

  wrapType(cb: ResolverWrapTypeFn, wrapperName: string = 'wrapType'): Resolver<TSource, TContext> {
    return this.wrap(
      (newResolver, prevResolver) => {
        const prevType = prevResolver.getType();
        const newType = cb(prevType);
        newResolver.setType(newType);
        return newResolver;
      },
      { name: wrapperName }
    );
  }

  addFilterArg(opts: ResolverFilterArgConfig<TSource, TContext>): Resolver<TSource, TContext> {
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
        throw new Error(
          'For Resolver.addFilterArg needs to provide `opts.filterTypeNameFallback: string`. ' +
            'This string will be used as unique name for `filter` type of input argument. ' +
            'Eg. FilterXXXXXInput'
        );
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
      resolver.setResolve(resolveParams => {
        const value = objectPath.get(resolveParams, ['args', 'filter', opts.name]);
        if (value !== null && value !== undefined) {
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

  addSortArg(opts: ResolverSortArgConfig<TSource, TContext>): Resolver<TSource, TContext> {
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
        throw new Error(
          'Resolver should have `sort` arg with type GraphQLEnumType. ' +
            `But got: ${util.inspect(sort.type, { depth: 2 })} `
        );
      }
    } else {
      if (!opts.sortTypeNameFallback || !isString(opts.sortTypeNameFallback)) {
        throw new Error(
          'For Resolver.addSortArg needs to provide `opts.sortTypeNameFallback: string`. ' +
            'This string will be used as unique name for `sort` type of input argument. ' +
            'Eg. SortXXXXXEnum'
        );
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
      resolver.setResolve(resolveParams => {
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
        `  type: ${util.inspect(resolver.type, { depth: 2 })},`,
        `  args: ${util.inspect(resolver.args, { depth: 3 }).replace('\n', `\n  ${spaces}`)},`,
        `  resolve: ${resolver.resolve ? resolver.resolve
              .toString()
              .replace('\n', `\n  ${spaces}`) : 'undefined'},`,
        `  parent: ${resolver.parent ? extendedInfo(resolver.parent, `  ${spaces}`) : ''}`,
        ')',
      ]
        .filter(s => !!s)
        .join(`\n  ${spaces}`);
    }

    return extendedInfo(this);
  }
}
