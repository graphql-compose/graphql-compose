/* @flow strict */
/* eslint-disable no-use-before-define, no-restricted-syntax */

import objectPath from 'object-path';
import util from 'util';
import {
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLEnumType,
  GraphQLObjectType,
  isInputType,
  getNamedType,
} from './graphql';
import type {
  GraphQLFieldConfigArgumentMap,
  GraphQLArgumentConfig,
  GraphQLOutputType,
  GraphQLFieldConfig,
  GraphQLInputType,
  GraphQLResolveInfo,
} from './graphql';
import type {
  TypeComposer,
  ComposeOutputType,
  ComposeArgumentConfig,
  ComposeFieldConfigArgumentMap,
  ComposePartialArgumentConfigAsObject,
  ComposeArgumentType,
} from './TypeComposer';
import type { InputTypeComposer, ComposeInputFieldConfig } from './InputTypeComposer';
import type { EnumTypeComposer } from './EnumTypeComposer';
import type { SchemaComposer } from './SchemaComposer';
import deepmerge from './utils/deepmerge';
import {
  resolveArgConfigMapAsThunk,
  resolveOutputConfigAsThunk,
  resolveArgConfigAsThunk,
} from './utils/configAsThunk';
import { only, clearName } from './utils/misc';
import { isFunction, isString } from './utils/is';
import filterByDotPaths from './utils/filterByDotPaths';
import { getProjectionFromAST } from './utils/projection';
import type { ProjectionType } from './utils/projection';
import { typeByPath } from './utils/typeByPath';
import GraphQLJSON from './type/json';
// import { deprecate } from './utils/debug';

export type ResolveParams<TSource, TContext> = {
  source: TSource,
  args: { [argName: string]: any },
  context: TContext,
  info: GraphQLResolveInfo,
  projection: $Shape<ProjectionType>,
  [opt: string]: any,
};
export type ResolverKinds = 'query' | 'mutation' | 'subscription';

export type ResolverFilterArgFn<TSource, TContext> = (
  query: any,
  value: any,
  resolveParams: ResolveParams<TSource, TContext>
) => any;

export type ResolverFilterArgConfig<TSource, TContext> = {
  +name: string,
  +type: ComposeArgumentType,
  +description?: ?string,
  +query?: ResolverFilterArgFn<TSource, TContext>,
  +filterTypeNameFallback?: string,
  +defaultValue?: any,
};

export type ResolverSortArgFn<TSource, TContext> = (
  resolveParams: ResolveParams<TSource, TContext>
) => mixed;

export type ResolverSortArgConfig<TSource, TContext> = {
  name: string,
  sortTypeNameFallback?: string,
  // value also can be an `Object`, but flow does not understande union with object and function
  // see https://github.com/facebook/flow/issues/1948
  value:
    | { [key: string]: any }
    | ResolverSortArgFn<TSource, TContext>
    | string
    | number
    | boolean
    | Array<any>,
  deprecationReason?: ?string,
  description?: ?string,
};

export type ResolverOpts<TSource, TContext> = {|
  type?: ComposeOutputType<TContext>,
  resolve?: ResolverRpCb<TSource, TContext>,
  args?: ComposeFieldConfigArgumentMap,
  name?: string,
  displayName?: string,
  kind?: ResolverKinds,
  description?: string,
  parent?: Resolver<TSource, TContext>,
|};

export type ResolverWrapCb<TSource, TContext> = (
  newResolver: Resolver<TSource, TContext>,
  prevResolver: Resolver<TSource, TContext>
) => Resolver<TSource, TContext>;

export type ResolverRpCb<TSource, TContext> = (
  resolveParams: $Shape<ResolveParams<TSource, TContext>>
) => Promise<any> | any;
export type ResolverNextRpCb<TSource, TContext> = (
  next: ResolverRpCb<TSource, TContext>
) => ResolverRpCb<TSource, TContext>;

export type ResolverWrapArgsCb = (
  prevArgs: GraphQLFieldConfigArgumentMap
) => ComposeFieldConfigArgumentMap;

export type ResolverWrapTypeCb<TContext> = (
  prevType: GraphQLOutputType
) => ComposeOutputType<TContext>;

export type ResolveDebugOpts = {
  showHidden?: boolean,
  depth?: number,
  colors?: boolean,
};

export class Resolver<TSource, TContext> {
  static schemaComposer: SchemaComposer<TContext>;

  get schemaComposer(): SchemaComposer<TContext> {
    return this.constructor.schemaComposer;
  }

  type: ComposeOutputType<TContext>;
  args: ComposeFieldConfigArgumentMap;
  resolve: ResolverRpCb<TSource, TContext>;
  name: string;
  displayName: ?string;
  kind: ?ResolverKinds;
  description: ?string;
  parent: ?Resolver<TSource, TContext>;

  constructor(opts: ResolverOpts<TSource, TContext>): Resolver<TSource, TContext> {
    if (!this.schemaComposer) {
      throw new Error('Class<Resolver> can only be created by a SchemaComposer.');
    }

    if (!opts.name) {
      throw new Error('For Resolver constructor the `opts.name` is required option.');
    }
    this.name = opts.name;
    this.displayName = opts.displayName || null;
    this.parent = opts.parent || null;
    this.kind = opts.kind || null;
    this.description = opts.description || '';

    if (opts.type) {
      this.setType(opts.type);
    }

    this.args = opts.args || {};

    if (opts.resolve) {
      this.resolve = opts.resolve;
    }

    // Alive proper Flow type casting in autosuggestions for class with Generics
    // it's required due using <TSource, TContext>
    // and Class<> utility type in SchemaComposer
    /* :: return this; */
  }

  // -----------------------------------------------
  // Output type methods
  // -----------------------------------------------

  getType(): GraphQLOutputType {
    if (!this.type) {
      return GraphQLJSON;
    }

    const fc = resolveOutputConfigAsThunk(this.schemaComposer, this.type, this.name, 'Resolver');

    return fc.type;
  }

  getTypeComposer(): TypeComposer<TContext> {
    const outputType = getNamedType(this.getType());
    if (!(outputType instanceof GraphQLObjectType)) {
      throw new Error(
        `Resolver ${this.name} cannot return its output type as TypeComposer instance. ` +
          `Cause '${this.type.toString()}' does not instance of GraphQLObjectType.`
      );
    }
    return new this.schemaComposer.TypeComposer(outputType);
  }

  setType(composeType: ComposeOutputType<TContext>): Resolver<TSource, TContext> {
    // check that `composeType` has correct data
    this.schemaComposer.typeMapper.convertOutputFieldConfig(composeType, 'setType', 'Resolver');

    this.type = composeType;
    return this;
  }

  // -----------------------------------------------
  // Args methods
  // -----------------------------------------------

  hasArg(argName: string): boolean {
    return !!this.args[argName];
  }

  getArg(argName: string): ComposeArgumentConfig {
    if (!this.hasArg(argName)) {
      throw new Error(
        `Cannot get arg '${argName}' for resolver ${this.name}. Argument does not exist.`
      );
    }

    return this.args[argName];
  }

  getArgConfig(argName: string): GraphQLArgumentConfig {
    const arg = this.getArg(argName);
    return resolveArgConfigAsThunk(this.schemaComposer, arg, argName, this.name, 'Resolver');
  }

  getArgType(argName: string): GraphQLInputType {
    const ac = this.getArgConfig(argName);
    return ac.type;
  }

  getArgTC(argName: string): InputTypeComposer {
    const argType = getNamedType(this.getArgType(argName));
    if (!(argType instanceof GraphQLInputObjectType)) {
      throw new Error(
        `Cannot get InputTypeComposer for arg '${argName}' in resolver ${this.getNestedName()}. ` +
          `This argument should be InputObjectType, but it has type '${argType.constructor.name}'`
      );
    }
    return new this.schemaComposer.InputTypeComposer(argType);
  }

  getArgs(): ComposeFieldConfigArgumentMap {
    return this.args;
  }

  getArgNames(): string[] {
    return Object.keys(this.args);
  }

  setArgs(args: ComposeFieldConfigArgumentMap): Resolver<TSource, TContext> {
    this.args = args;
    return this;
  }

  setArg(argName: string, argConfig: ComposeArgumentConfig): Resolver<TSource, TContext> {
    this.args[argName] = argConfig;
    return this;
  }

  extendArg(
    argName: string,
    partialArgConfig: ComposePartialArgumentConfigAsObject
  ): Resolver<TSource, TContext> {
    let prevArgConfig;
    try {
      prevArgConfig = this.getArgConfig(argName);
    } catch (e) {
      throw new Error(
        `Cannot extend arg '${argName}' in Resolver '${this.name}'. Argument does not exist.`
      );
    }

    this.setArg(argName, {
      ...prevArgConfig,
      ...partialArgConfig,
    });

    return this;
  }

  addArgs(newArgs: ComposeFieldConfigArgumentMap): Resolver<TSource, TContext> {
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
      if (keepArgNames.indexOf(argName) === -1) {
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

    let originalType = this.getArgType(argName);
    let isUnwrapped = false;
    if (originalType instanceof GraphQLNonNull) {
      originalType = originalType.ofType;
      isUnwrapped = true;
    }

    if (!(originalType instanceof GraphQLInputObjectType)) {
      throw new Error(
        `Can not clone arg ${argName} for resolver ${this.name}.` +
          'Argument should be GraphQLInputObjectType (complex input type).'
      );
    }
    if (!newTypeName || newTypeName !== clearName(newTypeName)) {
      throw new Error('You should provide new type name as second argument');
    }
    if (newTypeName === originalType.name) {
      throw new Error('You should provide new type name. It is equal to current name.');
    }

    let clonedType = this.schemaComposer.InputTypeComposer.createTemp(originalType)
      .clone(newTypeName)
      .getType();
    if (isUnwrapped) {
      clonedType = new GraphQLNonNull(clonedType);
    }

    this.extendArg(argName, { type: clonedType });
    return this;
  }

  isRequired(argName: string): boolean {
    return this.getArgType(argName) instanceof GraphQLNonNull;
  }

  makeRequired(argNameOrArray: string | Array<string>): Resolver<TSource, TContext> {
    const argNames = Array.isArray(argNameOrArray) ? argNameOrArray : [argNameOrArray];
    argNames.forEach(argName => {
      if (this.hasArg(argName)) {
        const argType = this.getArgType(argName);
        if (!isInputType(argType)) {
          throw new Error(
            `Cannot make argument ${argName} required. It should be InputType: ${JSON.stringify(
              argType
            )}`
          );
        }
        if (!(argType instanceof GraphQLNonNull)) {
          this.extendArg(argName, { type: new GraphQLNonNull(argType) });
        }
      }
    });
    return this;
  }

  makeOptional(argNameOrArray: string | Array<string>): Resolver<TSource, TContext> {
    const argNames = Array.isArray(argNameOrArray) ? argNameOrArray : [argNameOrArray];
    argNames.forEach(argName => {
      if (this.hasArg(argName)) {
        const argType = this.getArgType(argName);
        if (argType instanceof GraphQLNonNull) {
          this.extendArg(argName, { type: argType.ofType });
        }
      }
    });
    return this;
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
    const filter = resolver.hasArg('filter') ? resolver.getArgConfig('filter') : undefined;
    let filterITC;
    if (filter && filter.type instanceof GraphQLInputObjectType) {
      filterITC = new this.schemaComposer.InputTypeComposer(filter.type);
    } else {
      if (!opts.filterTypeNameFallback || !isString(opts.filterTypeNameFallback)) {
        throw new Error(
          'For Resolver.addFilterArg needs to provide `opts.filterTypeNameFallback: string`. ' +
            'This string will be used as unique name for `filter` type of input argument. ' +
            'Eg. FilterXXXXXInput'
        );
      }
      filterITC = this.schemaComposer.InputTypeComposer.createTemp(opts.filterTypeNameFallback);
    }

    let defaultValue: any;
    if (filter && filter.defaultValue) {
      defaultValue = filter.defaultValue;
    }
    if (opts.defaultValue) {
      if (!defaultValue) {
        defaultValue = {};
      }
      defaultValue[opts.name] = opts.defaultValue;
    }

    resolver.setArg('filter', {
      type: filterITC.getType(),
      description: (filter && filter.description) || undefined,
      defaultValue,
    });

    filterITC.setField(
      opts.name,
      (({
        ...only(opts, ['name', 'type', 'defaultValue', 'description']),
      }: any): ComposeInputFieldConfig)
    );

    const resolveNext = resolver.getResolve();
    const query = opts.query;
    if (query && isFunction(query)) {
      resolver.setResolve(async resolveParams => {
        const value = objectPath.get(resolveParams, ['args', 'filter', opts.name]);
        if (value !== null && value !== undefined) {
          if (!resolveParams.rawQuery) {
            resolveParams.rawQuery = {}; // eslint-disable-line
          }
          await query(resolveParams.rawQuery, value, resolveParams);
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

    // get sortETC or create new one
    let sortETC: EnumTypeComposer;
    if (resolver.hasArg('sort')) {
      const sortConfig = resolver.getArgConfig('sort');
      if (sortConfig.type instanceof GraphQLEnumType) {
        sortETC = this.schemaComposer.EnumTypeComposer.createTemp(sortConfig.type);
      } else {
        throw new Error(
          'Resolver must have `sort` arg with type GraphQLEnumType. ' +
            `But got: ${util.inspect(sortConfig.type, { depth: 2 })} `
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
      sortETC = this.schemaComposer.EnumTypeComposer.createTemp({
        name: opts.sortTypeNameFallback,
        values: {
          [opts.name]: {},
        },
      });
      resolver.setArg('sort', sortETC);
    }

    // extend sortETC with new sorting value
    sortETC.setField(opts.name, {
      description: opts.description,
      deprecationReason: opts.deprecationReason,
      value: isFunction(opts.value) ? opts.name : opts.value,
    });

    // If sort value is evaluable (function), then wrap resolve method
    const resolveNext = resolver.getResolve();
    if (isFunction(opts.value)) {
      const getValue: Function = opts.value;
      resolver.setResolve(resolveParams => {
        const value = objectPath.get(resolveParams, ['args', 'sort']);
        if (value === opts.name) {
          const newSortValue = getValue(resolveParams);
          resolveParams.args.sort = newSortValue; // eslint-disable-line
        }
        return resolveNext(resolveParams);
      });
    }

    return resolver;
  }

  // -----------------------------------------------
  // Resolve methods
  // -----------------------------------------------

  /*
  * This method should be overriden via constructor
  */
  /* eslint-disable */
  resolve(
    resolveParams: ResolveParams<TSource, TContext> | $Shape<ResolveParams<TSource, TContext>>
  ): Promise<mixed> {
    return Promise.resolve();
  }
  /* eslint-enable */

  getResolve(): ResolverRpCb<TSource, TContext> {
    return this.resolve;
  }

  setResolve(resolve: ResolverRpCb<TSource, TContext>): Resolver<TSource, TContext> {
    this.resolve = resolve;
    return this;
  }

  // -----------------------------------------------
  // Wrap methods
  // -----------------------------------------------

  wrap(
    cb: ?ResolverWrapCb<TSource, TContext>,
    newResolverOpts: ?$Shape<ResolverOpts<TSource, TContext>> = {}
  ): Resolver<TSource, TContext> {
    const prevResolver: Resolver<TSource, TContext> = this;
    const newResolver = this.clone({
      name: 'wrap',
      parent: prevResolver,
      ...newResolverOpts,
    });

    if (isFunction(cb)) {
      const resolver = cb(newResolver, prevResolver);
      if (resolver) return resolver;
    }

    return newResolver;
  }

  wrapResolve(
    cb: ResolverNextRpCb<TSource, TContext>,
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

  wrapArgs(cb: ResolverWrapArgsCb, wrapperName: string = 'wrapArgs'): Resolver<TSource, TContext> {
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
    return this.wrap(newResolver => newResolver.cloneArg(argName, newTypeName), {
      name: 'cloneFilterArg',
    });
  }

  wrapType(
    cb: ResolverWrapTypeCb<TContext>,
    wrapperName: string = 'wrapType'
  ): Resolver<TSource, TContext> {
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

  // -----------------------------------------------
  // Misc methods
  // -----------------------------------------------

  getFieldConfig(
    opts: {
      projection?: ProjectionType,
    } = {}
  ): GraphQLFieldConfig<TSource, TContext> {
    const resolve = this.getResolve();
    return {
      type: this.getType(),
      args: resolveArgConfigMapAsThunk(this.schemaComposer, this.getArgs(), this.name, 'Resolver'),
      description: this.description,
      resolve: (source: TSource, args, context: TContext, info: GraphQLResolveInfo) => {
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
    return typeByPath(this, path);
  }

  clone(opts: $Shape<ResolverOpts<TSource, TContext>> = {}): Resolver<TSource, TContext> {
    const oldOpts = {};

    const self: Resolver<TSource, TContext> = this;
    for (const key in self) {
      if (self.hasOwnProperty(key)) {
        // $FlowFixMe
        oldOpts[key] = self[key];
      }
    }
    oldOpts.displayName = undefined;
    oldOpts.args = ({ ...this.args }: GraphQLFieldConfigArgumentMap);
    return new this.schemaComposer.Resolver(
      (({ ...oldOpts, ...opts }: any): ResolverOpts<TSource, TContext>)
    );
  }

  // -----------------------------------------------
  // Debug methods
  // -----------------------------------------------

  getNestedName() {
    const name = this.displayName || this.name;
    if (this.parent) {
      return `${name}(${this.parent.getNestedName()})`;
    }
    return name;
  }

  toString(colors: boolean = true) {
    return util.inspect(this.toDebugStructure(false), { depth: 20, colors }).replace(/\\n/g, '\n');
  }

  setDisplayName(name: string): Resolver<TSource, TContext> {
    this.displayName = name;
    return this;
  }

  toDebugStructure(colors: boolean = true): Object {
    const info: any = {
      name: this.name,
      displayName: this.displayName,
      type: util.inspect(this.type, { depth: 2, colors }),
      args: this.args,
      resolve: this.resolve ? this.resolve.toString() : this.resolve,
    };
    if (this.parent) {
      info.resolve = [info.resolve, { 'Parent resolver': this.parent.toDebugStructure(colors) }];
    }
    return info;
  }

  debugExecTime(): Resolver<TSource, TContext> {
    /* eslint-disable no-console */
    return this.wrapResolve(
      next => async rp => {
        const name = `Execution time for ${this.getNestedName()}`;
        console.time(name);
        const res = await next(rp);
        console.timeEnd(name);
        return res;
      },
      'debugExecTime'
    );
    /* eslint-enable no-console */
  }

  debugParams(
    filterPaths: ?(string | string[]),
    opts?: ResolveDebugOpts = { colors: true, depth: 5 }
  ): Resolver<TSource, TContext> {
    /* eslint-disable no-console */
    return this.wrapResolve(
      next => rp => {
        console.log(`ResolveParams for ${this.getNestedName()}:`);
        const data = filterByDotPaths(rp, filterPaths, {
          // is hidden (use debugParams(["info"])) or debug({ params: ["info"]})
          // `is hidden (use debugParams(["context.*"])) or debug({ params: ["context.*"]})`,
          hideFields:
            rp && rp.context && rp.context.res && rp.context.params && rp.context.headers
              ? {
                  // looks like context is express request, colapse it
                  info: '[[hidden]]',
                  context: '[[hidden]]',
                }
              : {
                  info: '[[hidden]]',
                  'context.*': '[[hidden]]',
                },
          hideFieldsNote:
            'Some data was [[hidden]] to display this fields use debugParams("%fieldNames%")',
        });
        console.dir(data, opts);
        return next(rp);
      },
      'debugParams'
    );
    /* eslint-enable no-console */
  }

  debugPayload(
    filterPaths: ?(string | string[]),
    opts?: ResolveDebugOpts = { colors: true, depth: 5 }
  ): Resolver<TSource, TContext> {
    /* eslint-disable no-console */
    return this.wrapResolve(
      next => async rp => {
        try {
          const res = await next(rp);
          console.log(`Resolved Payload for ${this.getNestedName()}:`);
          if (Array.isArray(res) && res.length > 3 && !filterPaths) {
            console.dir(
              [
                filterPaths ? filterByDotPaths(res[0], filterPaths) : res[0],
                `[debug note]: Other ${res.length - 1} records was [[hidden]]. ` +
                  'Use debugPayload("0 1 2 3 4") or debug({ payload: "0 1 2 3 4" }) for display this records',
              ],
              opts
            );
          } else {
            console.dir(filterPaths ? filterByDotPaths(res, filterPaths) : res, opts);
          }
          return res;
        } catch (e) {
          console.log(`Rejected Payload for ${this.getNestedName()}:`);
          console.log(e);
          throw e;
        }
      },
      'debugPayload'
    );
    /* eslint-enable no-console */
  }

  debug(
    filterDotPaths?: {
      params?: ?(string | string[]),
      payload?: ?(string | string[]),
    },
    opts?: ResolveDebugOpts = { colors: true, depth: 2 }
  ): Resolver<TSource, TContext> {
    return this.debugExecTime()
      .debugParams(filterDotPaths ? filterDotPaths.params : null, opts)
      .debugPayload(filterDotPaths ? filterDotPaths.payload : null, opts);
  }
}
