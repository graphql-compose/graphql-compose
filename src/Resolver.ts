import type {
  GraphQLFieldConfigArgumentMap,
  GraphQLArgumentConfig,
  GraphQLOutputType,
  GraphQLFieldConfig,
  GraphQLInputType,
  GraphQLResolveInfo,
  GraphQLFieldResolver,
} from './graphql';
import { ObjectTypeComposer } from './ObjectTypeComposer';
import type {
  ObjectTypeComposerArgumentConfigMap,
  ObjectTypeComposerArgumentConfigMapDefinition,
  ObjectTypeComposerArgumentConfig,
  ObjectTypeComposerArgumentConfigDefinition,
  ObjectTypeComposerArgumentConfigAsObjectDefinition,
} from './ObjectTypeComposer';
import { InputTypeComposer } from './InputTypeComposer';
import { EnumTypeComposer } from './EnumTypeComposer';
import { SchemaComposer } from './SchemaComposer';
import { deepmerge } from './utils/deepmerge';
import { clearName, inspect, mapEachKey } from './utils/misc';
import { isFunction, isString } from './utils/is';
import { filterByDotPaths } from './utils/filterByDotPaths';
import { getProjectionFromAST } from './utils/projection';
import type { ProjectionType } from './utils/projection';
import { typeByPath, TypeInPath } from './utils/typeByPath';
import {
  unwrapOutputTC,
  unwrapInputTC,
  replaceTC,
  isComposeInputType,
  cloneTypeTo,
} from './utils/typeHelpers';
import type {
  ComposeOutputType,
  ComposeOutputTypeDefinition,
  ComposeNamedOutputType,
  ComposeNamedInputType,
  ComposeInputTypeDefinition,
} from './utils/typeHelpers';
import type { Thunk, ThunkWithSchemaComposer, Extensions, Directive } from './utils/definitions';
import { GraphQLJSON } from './type';
import { NonNullComposer } from './NonNullComposer';
import { ListComposer } from './ListComposer';

export type ResolverKinds = 'query' | 'mutation' | 'subscription';

export type ResolverDefinition<TSource, TContext, TArgs = any> = {
  type?: ThunkWithSchemaComposer<
    | Readonly<ComposeOutputType<TContext>>
    | ComposeOutputTypeDefinition<TContext>
    | Readonly<Resolver<any, TContext, any>>,
    SchemaComposer<TContext>
  >;
  resolve?: ResolverRpCb<TSource, TContext, TArgs>;
  args?: ObjectTypeComposerArgumentConfigMapDefinition<TArgs>;
  name?: string;
  displayName?: string;
  kind?: ResolverKinds;
  description?: string;
  deprecationReason?: string | null;
  projection?: ProjectionType;
  parent?: Resolver<any, TContext, any>;
  extensions?: Extensions;
  directives?: Directive[];
};

export type ResolverResolveParams<TSource, TContext, TArgs = any> = {
  source: TSource;
  args: TArgs;
  context: TContext;
  info: GraphQLResolveInfo;
  projection: Partial<ProjectionType>;
  [opt: string]: any;
};

export type ResolverFilterArgFn<TSource, TContext, TArgs = any> = (
  query: any,
  value: any,
  resolveParams: ResolverResolveParams<TSource, TContext, TArgs>
) => any;

export type ResolverFilterArgConfigDefinition<TSource, TContext, TArgs = any> = {
  name: string;
  type: ComposeInputTypeDefinition;
  description?: string | null | void;
  query?: ResolverFilterArgFn<TSource, TContext, TArgs>;
  filterTypeNameFallback?: string;
  defaultValue?: any;
};

export type ResolverSortArgFn<TSource, TContext, TArgs = any> = (
  resolveParams: ResolverResolveParams<TSource, TContext, TArgs>
) => any;

export type ResolverSortArgConfig<TSource, TContext, TArgs = any> = {
  name: string;
  sortTypeNameFallback?: string;
  value:
    | { [key: string]: any }
    | ResolverSortArgFn<TSource, TContext, TArgs>
    | string
    | number
    | boolean
    | any[];
  deprecationReason?: string | null;
  description?: string | null;
};

export type ResolverWrapCb<TNewSource, TPrevSource, TContext, TNewArgs = any, TPrevArgs = any> = (
  newResolver: Resolver<TNewSource, TContext, TNewArgs>,
  prevResolver: Resolver<TPrevSource, TContext, TPrevArgs>
) => Resolver<TNewSource, TContext, TNewArgs>;

export type ResolverRpCb<TSource, TContext, TArgs = any> = (
  resolveParams: ResolverResolveParams<TSource, TContext, TArgs>
) => Promise<any> | any;
export type ResolverRpCbPartial<TSource, TContext, TArgs = any> = (
  resolveParams: Partial<ResolverResolveParams<TSource, TContext, TArgs>>
) => Promise<any> | any;
export type ResolverNextRpCb<TSource, TContext, TArgs = any> = (
  next: ResolverRpCb<TSource, TContext, TArgs>
) => ResolverRpCb<TSource, TContext, TArgs>;

export type ResolverDebugOpts = {
  showHidden?: boolean;
  depth?: number;
  colors?: boolean;
};

export type ResolverMiddleware<TSource, TContext, TArgs = any> = (
  resolve: (source: TSource, args: TArgs, context: TContext, info: GraphQLResolveInfo) => any,
  source: TSource,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => any;

/**
 * The most interesting class in `graphql-compose`. The main goal of `Resolver` is to keep available resolve methods for Type and use them for building relation with other types.
 */
export class Resolver<TSource = any, TContext = any, TArgs = any, TReturn = any> {
  schemaComposer: SchemaComposer<TContext>;
  // @ts-ignore defined in constructor via setter
  type: ComposeOutputType<TContext>;
  // @ts-ignore defined in constructor via setter
  args: ObjectTypeComposerArgumentConfigMap<any>;
  name: string;
  displayName: string | undefined;
  kind: ResolverKinds | undefined;
  description: string | undefined;
  deprecationReason: string | null | undefined;
  projection: ProjectionType;
  parent: Resolver<TSource, TContext, any> | undefined;
  extensions: Extensions | undefined;
  directives: Directive[] | undefined;
  resolve: ResolverRpCbPartial<TSource, TContext, TArgs> = () => Promise.resolve();

  constructor(
    opts: ResolverDefinition<TSource, TContext, TArgs>,
    schemaComposer: SchemaComposer<TContext>
  ) {
    if (!(schemaComposer instanceof SchemaComposer)) {
      throw new Error(
        'You must provide SchemaComposer instance as a second argument for `new Resolver(opts, SchemaComposer)`'
      );
    }
    this.schemaComposer = schemaComposer;

    if (!opts.name) {
      throw new Error('For Resolver constructor the `opts.name` is required option.');
    }
    this.name = opts.name;
    this.displayName = opts.displayName;
    this.parent = opts.parent;
    this.kind = opts.kind;
    this.description = opts.description;
    this.deprecationReason = opts.deprecationReason;
    this.projection = opts.projection || {};
    this.extensions = opts.extensions;

    if (opts.type) {
      this.setType(opts.type);
    }

    this.setArgs(opts.args || ({} as ObjectTypeComposerArgumentConfigMapDefinition<any>));

    if (opts.resolve) {
      this.resolve = opts.resolve as any;
    }

    if (opts.directives) {
      this.directives = opts.directives;
    }
  }

  // -----------------------------------------------
  // Output type methods
  // -----------------------------------------------

  getType(): GraphQLOutputType {
    if (!this.type) {
      return GraphQLJSON;
    }
    return this.type.getType();
  }

  getTypeName(): string {
    return this.type.getTypeName();
  }

  getTypeComposer(): ComposeNamedOutputType<TContext> {
    const anyTC = this.type;

    // Unwrap from List, NonNull and ThunkComposer
    // It's old logic from v1.0.0 and may be changed in future.
    return unwrapOutputTC(anyTC);
  }

  /**
   * Almost alias for `getTypeComposer`, but returns only ObjectTypeComposer.
   * It will throw an error if resolver has another kind of type.
   */
  getOTC(): ObjectTypeComposer<TReturn, TContext> {
    const anyTC = this.getTypeComposer();
    if (!(anyTC instanceof ObjectTypeComposer)) {
      throw new Error(
        `Resolver ${this.name} cannot return its output type as ObjectTypeComposer instance. ` +
          `Cause '${this.type.toString()}' does not instance of ${anyTC.constructor.name}.`
      );
    }
    return anyTC;
  }

  setType<TNewReturn>(
    typeDef: ThunkWithSchemaComposer<
      | Readonly<ComposeOutputType<TContext>>
      | ComposeOutputTypeDefinition<TContext>
      | Readonly<Resolver<any, TContext, any>>,
      SchemaComposer<TContext>
    >
  ): Resolver<TSource, TContext, TArgs, TNewReturn> {
    const tc = this.schemaComposer.typeMapper.convertOutputTypeDefinition(
      typeDef,
      'setType',
      'Resolver'
    );

    if (!tc) {
      throw new Error(`Cannot convert to ObjectType following value: ${inspect(typeDef)}`);
    }

    this.type = tc;
    return this as any;
  }

  // -----------------------------------------------
  // Args methods
  // -----------------------------------------------

  hasArg(argName: string): boolean {
    return !!this.args[argName];
  }

  getArg(argName: string): ObjectTypeComposerArgumentConfig {
    if (!this.hasArg(argName)) {
      throw new Error(
        `Cannot get arg '${argName}' for resolver ${this.name}. Argument does not exist.`
      );
    }

    let arg = this.args[argName];

    if (isFunction(arg)) arg = arg(this.schemaComposer);

    if (typeof arg === 'string' || isComposeInputType(arg) || Array.isArray(arg)) {
      return { type: arg as any };
    }

    return arg;
  }

  getArgConfig(argName: string): GraphQLArgumentConfig {
    const ac = this.getArg(argName);
    return {
      ...ac,
      type: ac.type.getType(),
    };
  }

  getArgType(argName: string): GraphQLInputType {
    const ac = this.getArgConfig(argName);
    return ac.type;
  }

  getArgTypeName(fieldName: string): string {
    return this.getArg(fieldName).type.getTypeName();
  }

  getArgs(): ObjectTypeComposerArgumentConfigMap<TArgs> {
    return this.args;
  }

  getArgNames(): string[] {
    return Object.keys(this.args);
  }

  setArgs<TNewArgs>(
    args: ObjectTypeComposerArgumentConfigMapDefinition<TNewArgs>
  ): Resolver<TSource, TContext, TNewArgs> {
    this.args = this.schemaComposer.typeMapper.convertArgConfigMap(args, this.name, 'Resolver');
    return this as any;
  }

  setArg(argName: string, argConfig: ObjectTypeComposerArgumentConfigDefinition): this {
    this.args[argName] = this.schemaComposer.typeMapper.convertArgConfig(
      argConfig,
      argName,
      this.name,
      'Resolver'
    );
    return this;
  }

  setArgType(argName: string, typeDef: Thunk<ComposeInputTypeDefinition>): this {
    const ac = this.getArg(argName);
    const tc = this.schemaComposer.typeMapper.convertInputTypeDefinition(
      typeDef,
      argName,
      'Resolver.args'
    );

    if (!tc) {
      throw new Error(`Cannot create InputType from ${inspect(typeDef)}`);
    }

    ac.type = tc;

    return this;
  }

  extendArg(
    argName: string,
    partialArgConfig: Partial<ObjectTypeComposerArgumentConfigAsObjectDefinition>
  ): this {
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
      ...(partialArgConfig as any),
    });

    return this;
  }

  addArgs(newArgs: ObjectTypeComposerArgumentConfigMapDefinition<any>): this {
    this.setArgs({ ...this.getArgs(), ...newArgs });
    return this;
  }

  removeArg(argNameOrArray: string | string[]): this {
    const argNames = Array.isArray(argNameOrArray) ? argNameOrArray : [argNameOrArray];
    argNames.forEach((argName) => {
      delete this.args[argName];
    });
    return this;
  }

  removeOtherArgs(argNameOrArray: string | string[]): this {
    const keepArgNames = Array.isArray(argNameOrArray) ? argNameOrArray : [argNameOrArray];
    Object.keys(this.args).forEach((argName) => {
      if (keepArgNames.indexOf(argName) === -1) {
        delete this.args[argName];
      }
    });
    return this;
  }

  reorderArgs(names: string[]): this {
    const orderedArgs = {} as any;
    names.forEach((name) => {
      if (this.args[name]) {
        orderedArgs[name] = this.args[name];
        delete this.args[name];
      }
    });
    this.args = { ...orderedArgs, ...this.args };
    return this;
  }

  getArgTC(argName: string): ComposeNamedInputType<TContext> {
    const argType = this.getArg(argName).type;

    // Unwrap from List, NonNull and ThunkComposer
    return unwrapInputTC(argType);
  }

  /**
   * Alias for `getArgTC()` but returns statically checked InputTypeComposer.
   * If field have other type then error will be thrown.
   */
  getArgITC(argName: string): InputTypeComposer<TContext> {
    const tc = this.getArgTC(argName);
    if (!(tc instanceof InputTypeComposer)) {
      throw new Error(
        `Resolver(${this.name}).getArgITC('${argName}') must be InputTypeComposer, but received ${tc.constructor.name}. Maybe you need to use 'getArgTC()' method which returns any type composer?`
      );
    }
    return tc;
  }

  isArgNonNull(argName: string): boolean {
    return this.getArg(argName).type instanceof NonNullComposer;
  }

  makeArgNonNull(argNameOrArray: string | string[]): this {
    const argNames = Array.isArray(argNameOrArray) ? argNameOrArray : [argNameOrArray];
    argNames.forEach((argName) => {
      if (this.hasArg(argName)) {
        const argTC = this.getArg(argName).type;
        if (!(argTC instanceof NonNullComposer)) {
          this.setArgType(argName, new NonNullComposer(argTC));
        }
      }
    });
    return this;
  }

  // alias for makeArgNonNull()
  makeRequired(argNameOrArray: string | string[]): this {
    return this.makeArgNonNull(argNameOrArray);
  }

  makeArgNullable(argNameOrArray: string | string[]): this {
    const argNames = Array.isArray(argNameOrArray) ? argNameOrArray : [argNameOrArray];
    argNames.forEach((argName) => {
      if (this.hasArg(argName)) {
        const argTC = this.getArg(argName).type;
        if (argTC instanceof NonNullComposer) {
          this.setArgType(argName, argTC.ofType);
        }
      }
    });
    return this;
  }

  makeOptional(argNameOrArray: string | string[]): this {
    return this.makeArgNullable(argNameOrArray);
  }

  isArgPlural(argName: string): boolean {
    const type = this.getArg(argName).type;
    return (
      type instanceof ListComposer ||
      (type instanceof NonNullComposer && type.ofType instanceof ListComposer)
    );
  }

  makeArgPlural(argNameOrArray: string | string[]): this {
    const argNames = Array.isArray(argNameOrArray) ? argNameOrArray : [argNameOrArray];
    argNames.forEach((argName) => {
      const ac = this.args[argName];
      if (ac && !(ac.type instanceof ListComposer)) {
        ac.type = new ListComposer(ac.type);
      }
    });
    return this;
  }

  makeArgNonPlural(argNameOrArray: string | string[]): this {
    const argNames = Array.isArray(argNameOrArray) ? argNameOrArray : [argNameOrArray];
    argNames.forEach((argName) => {
      const ac = this.args[argName];
      if (ac) {
        if (ac.type instanceof ListComposer) {
          ac.type = ac.type.ofType;
        } else if (ac.type instanceof NonNullComposer && ac.type.ofType instanceof ListComposer) {
          ac.type =
            ac.type.ofType.ofType instanceof NonNullComposer
              ? ac.type.ofType.ofType
              : new NonNullComposer(ac.type.ofType.ofType);
        }
      }
    });
    return this;
  }

  cloneArg(argName: string, newTypeName: string): this {
    if (!{}.hasOwnProperty.call(this.args, argName)) {
      throw new Error(
        `Can not clone arg ${inspect(argName)} for resolver ${this.name}. Argument does not exist.`
      );
    }

    const argTC = this.getArg(argName).type;

    const clonedTC = replaceTC(argTC, (unwrappedTC) => {
      if (!(unwrappedTC instanceof InputTypeComposer)) {
        throw new Error(
          `Cannot clone arg ${inspect(argName)} for resolver ${inspect(this.name)}. ` +
            `Argument should be InputObjectType, but received: ${inspect(unwrappedTC)}.`
        );
      }
      if (!newTypeName || newTypeName !== clearName(newTypeName)) {
        throw new Error('You should provide new type name as second argument');
      }
      if (newTypeName === unwrappedTC.getTypeName()) {
        throw new Error(
          `You should provide new type name. It is equal to current name: ${inspect(newTypeName)}.`
        );
      }
      return unwrappedTC.clone(newTypeName);
    });

    if (clonedTC) this.setArgType(argName, clonedTC);

    return this;
  }

  addFilterArg(opts: ResolverFilterArgConfigDefinition<TSource, TContext, TArgs>): this {
    if (!opts.name) {
      throw new Error('For Resolver.addFilterArg the arg name `opts.name` is required.');
    }

    if (!opts.type) {
      throw new Error('For Resolver.addFilterArg the arg type `opts.type` is required.');
    }

    const resolver = this.wrap(null, { name: 'addFilterArg' });

    // get filterTC or create new one
    let filterITC: InputTypeComposer<any> | undefined;
    if (resolver.hasArg('filter')) {
      filterITC = resolver.getArgTC('filter') as any;
    }

    if (!(filterITC instanceof InputTypeComposer)) {
      if (!opts.filterTypeNameFallback || !isString(opts.filterTypeNameFallback)) {
        throw new Error(
          'For Resolver.addFilterArg needs to provide `opts.filterTypeNameFallback: string`. ' +
            'This string will be used as unique name for `filter` type of input argument. ' +
            'Eg. FilterXXXXXInput'
        );
      }
      filterITC = InputTypeComposer.create(opts.filterTypeNameFallback, this.schemaComposer);
      resolver.args.filter = {
        type: filterITC,
      };
    }

    const { name, type, defaultValue, description } = opts;
    filterITC.setField(name, { type, description } as any);

    // default value can be written only on argConfig
    if (defaultValue !== undefined) {
      resolver.args.filter.defaultValue = resolver.args.filter.defaultValue || {};
      resolver.args.filter.defaultValue[name] = defaultValue;
    }

    const resolveNext = resolver.getResolve();
    const query = opts.query;
    if (query && isFunction(query)) {
      resolver.setResolve(async (resolveParams: any) => {
        const value = resolveParams?.args?.filter?.[name];
        if (value !== null && value !== undefined) {
          if (!resolveParams.rawQuery) {
            resolveParams.rawQuery = {};
          }
          await query(resolveParams.rawQuery, value, resolveParams);
        }
        return resolveNext(resolveParams);
      });
    }

    return resolver as any;
  }

  addSortArg(opts: ResolverSortArgConfig<TSource, TContext, TArgs>): this {
    if (!opts.name) {
      throw new Error('For Resolver.addSortArg the `opts.name` is required.');
    }

    if (!opts.value) {
      throw new Error('For Resolver.addSortArg the `opts.value` is required.');
    }

    const resolver = this.wrap(null, { name: 'addSortArg' });

    // get sortETC or create new one
    let sortETC: EnumTypeComposer<TContext> | undefined;
    if (resolver.hasArg('sort')) {
      sortETC = resolver.getArgTC('sort') as any;
    }

    if (!sortETC) {
      if (!opts.sortTypeNameFallback || !isString(opts.sortTypeNameFallback)) {
        throw new Error(
          'For Resolver.addSortArg needs to provide `opts.sortTypeNameFallback: string`. ' +
            'This string will be used as unique name for `sort` type of input argument. ' +
            'Eg. SortXXXXXEnum'
        );
      }
      sortETC = EnumTypeComposer.create(opts.sortTypeNameFallback, this.schemaComposer);
      resolver.args.sort = {
        type: sortETC,
      };
    }

    if (!(sortETC instanceof EnumTypeComposer)) {
      throw new Error(`Resolver must have 'sort' arg with EnumType, but got: ${inspect(sortETC)} `);
    }

    const { name, description, deprecationReason, value } = opts;

    // extend sortETC with new sorting value
    sortETC.setField(name, {
      description,
      deprecationReason,
      value,
    });

    // If sort value is computable (function), then wrap resolve method
    const resolveNext = resolver.getResolve();
    if (isFunction(value)) {
      sortETC.extendField(name, { value: name });
      const getValue = value as any;
      resolver.setResolve((resolveParams: any) => {
        const v = resolveParams?.args?.sort;
        if (v === name) {
          const newSortValue = getValue(resolveParams);
          (resolveParams.args as any).sort = newSortValue;
        }
        return resolveNext(resolveParams);
      });
    }

    return resolver as any;
  }

  // -----------------------------------------------
  // Resolve methods
  // -----------------------------------------------

  getResolve(): ResolverRpCb<TSource, TContext, TArgs> {
    return this.resolve;
  }

  setResolve(resolve: ResolverRpCb<TSource, TContext, TArgs>): this {
    this.resolve = resolve as any;
    return this;
  }

  // -----------------------------------------------
  // Wrap methods
  // -----------------------------------------------

  /**
   * You may construct a new resolver with wrapped logic:
   *
   * @example
   *     const log = [];
   *
   *     const mw1 = async (resolve, source, args, context, info) => {
   *       log.push('m1.before');
   *       const res = await resolve(source, args, context, info);
   *       log.push('m1.after');
   *       return res;
   *     };
   *
   *     const mw2 = async (resolve, source, args, context, info) => {
   *       log.push('m2.before');
   *       const res = await resolve(source, args, context, info);
   *       log.push('m2.after');
   *       return res;
   *     };
   *
   *     const newResolver = Resolver.withMiddlewares([mw1, mw2]);
   *     await newResolver.resolve({});
   *
   *     expect(log).toEqual([
   *       'm1.before',
   *       'm2.before',
   *       'call resolve',
   *       'm2.after',
   *       'm1.after'
   *     ]);
   */
  withMiddlewares(
    middlewares: Array<ResolverMiddleware<TSource, TContext, TArgs>>
  ): Resolver<TSource, TContext, TArgs> {
    if (!Array.isArray(middlewares)) {
      throw new Error(
        `You should provide array of middlewares '(resolve, source, args, context, info) => any', but provided ${inspect(
          middlewares
        )}.`
      );
    }

    let resolver = this as Resolver<TSource, TContext, TArgs>;
    middlewares.reverse().forEach((mw) => {
      let name;
      if (mw.name) {
        name = mw.name;
      } else if ((mw as any).constructor && mw.constructor.name) {
        name = mw.constructor.name;
      } else {
        name = 'middleware';
      }
      const newResolver = this.clone({ name, parent: resolver });
      const resolve = resolver.getResolve();
      newResolver.setResolve((rp) =>
        mw(
          (source, args, context, info) => {
            return resolve({ ...rp, source, args, context, info });
          },
          rp.source as any,
          rp.args as any,
          rp.context,
          rp.info
        )
      );
      resolver = newResolver as any;
    });

    return resolver;
  }

  wrap<TNewSource, TNewArgs>(
    cb?: ResolverWrapCb<TNewSource, TSource, TContext, TNewArgs, TArgs> | null,
    newResolverOpts: Partial<ResolverDefinition<TNewSource, TContext, TNewArgs>> = {}
  ): Resolver<TNewSource, TContext, TNewArgs> {
    const prevResolver = this as Resolver<TSource, TContext, TArgs>;
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
    cb: ResolverNextRpCb<TSource, TContext, TArgs>,
    wrapperName: string = 'wrapResolve'
  ): Resolver<TSource, TContext, TArgs> {
    return this.wrap(
      (newResolver, prevResolver) => {
        const newResolve = cb(prevResolver.getResolve());
        newResolver.setResolve(newResolve);
        return newResolver;
      },
      { name: wrapperName }
    );
  }

  wrapArgs<TNewArgs>(
    cb: (
      prevArgs: GraphQLFieldConfigArgumentMap
    ) => ObjectTypeComposerArgumentConfigMapDefinition<TArgs>,
    wrapperName: string = 'wrapArgs'
  ): Resolver<TSource, TContext, TNewArgs> {
    return this.wrap(
      (newResolver, prevResolver) => {
        // clone prevArgs, to avoid changing args in callback
        const prevArgs: any = { ...prevResolver.getArgs() };
        const newArgs = cb(prevArgs) || prevArgs;
        newResolver.setArgs(newArgs);
        return newResolver;
      },
      { name: wrapperName }
    );
  }

  wrapCloneArg(argName: string, newTypeName: string): Resolver<TSource, TContext, TArgs> {
    return this.wrap((newResolver) => newResolver.cloneArg(argName, newTypeName), {
      name: 'cloneFilterArg',
    });
  }

  wrapType(
    cb: (prevType: ComposeOutputType<TContext>) => ComposeOutputTypeDefinition<TContext>,
    wrapperName: string = 'wrapType'
  ): Resolver<TSource, TContext, TArgs> {
    return this.wrap(
      (newResolver, prevResolver) => {
        const prevType = prevResolver.type;
        const newType = cb(prevType) || prevType;
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
      projection?: ProjectionType;
    } = {}
  ): GraphQLFieldConfig<TSource, TContext, TArgs> {
    const fc: GraphQLFieldConfig<TSource, TContext, TArgs> = {
      type: this.getType(),
      args: mapEachKey(this.getArgs(), (ac) => ({
        ...ac,
        type: ac.type.getType(),
      })),
      resolve: this.getFieldResolver(opts),
    };
    if (this.description) fc.description = this.description;
    if (this.deprecationReason) fc.deprecationReason = this.deprecationReason;
    return fc;
  }

  getFieldResolver(
    opts: {
      projection?: ProjectionType;
    } = {}
  ): GraphQLFieldResolver<TSource, TContext, TArgs> {
    const resolve = this.getResolve();
    return (source: TSource, args: TArgs, context: TContext, info: GraphQLResolveInfo) => {
      let projection = getProjectionFromAST(info);
      if (this.projection) {
        projection = deepmerge(projection, this.projection) as ProjectionType;
      }
      if (opts.projection) {
        projection = deepmerge(projection, opts.projection) as ProjectionType;
      }
      return resolve({ source, args, context, info, projection });
    };
  }

  getKind(): ResolverKinds | void {
    return this.kind;
  }

  setKind(kind: string): this {
    if (kind !== 'query' && kind !== 'mutation' && kind !== 'subscription') {
      throw new Error(
        `You provide incorrect value '${kind}' for Resolver.setKind method. ` +
          'Valid values are: query | mutation | subscription'
      );
    }
    this.kind = kind;
    return this;
  }

  getDescription(): string | undefined {
    return this.description;
  }

  setDescription(description: string | undefined): this {
    this.description = description;
    return this;
  }

  getDeprecationReason(): string | undefined | null {
    return this.deprecationReason;
  }

  setDeprecationReason(reason: string | undefined): this {
    this.deprecationReason = reason;
    return this;
  }

  get(path: string | string[]): TypeInPath<TContext> | void {
    return typeByPath(this, path);
  }

  /**
   * Clone this Resolver with overriding of some options.
   * Internally it just copies all properties.
   * But for `args` and `projection` it recreates objects with the same type & values (it allows to add or remove properties without affection old Resolver).
   */
  clone<TNewSource, TNewArgs>(
    opts: Partial<ResolverDefinition<TNewSource, TContext, TNewArgs>> = {}
  ): Resolver<TNewSource, TContext, TNewArgs> {
    const oldOpts = {} as ResolverDefinition<TNewSource, TContext>;

    const self = this as Resolver<TSource, TContext, TArgs>;
    for (const key in self) {
      if (self.hasOwnProperty(key)) {
        (oldOpts as any)[key] = (self as any)[key];
      }
    }
    oldOpts.displayName = undefined;
    oldOpts.args = { ...this.args };
    if (this.projection) {
      oldOpts.projection = { ...this.projection };
    }
    return new Resolver({ ...oldOpts, ...opts }, this.schemaComposer);
  }

  /**
   * Clone this resolver to another SchemaComposer.
   * Also will be cloned all sub-types.
   */
  cloneTo(
    anotherSchemaComposer: SchemaComposer<any>,
    cloneMap: Map<any, any> = new Map()
  ): Resolver<any, any, any> {
    if (!anotherSchemaComposer) {
      throw new Error('You should provide SchemaComposer for InterfaceTypeComposer.cloneTo()');
    }

    if (cloneMap.has(this)) return cloneMap.get(this);
    const cloned = new Resolver(
      {
        name: this.name,
        displayName: this.displayName,
        kind: this.kind,
        description: this.description,
        deprecationReason: this.deprecationReason,
        projection: { ...this.projection },
        extensions: { ...this.extensions },
        resolve: this.resolve,
      },
      anotherSchemaComposer
    );
    cloneMap.set(this, cloned);

    if (this.type) {
      cloned.type = this.type.cloneTo(anotherSchemaComposer, cloneMap) as any;
    }

    if (this.parent) {
      cloned.parent = this.parent.cloneTo(anotherSchemaComposer, cloneMap);
    }

    cloned.args = mapEachKey(this.args, (argConfig) => ({
      ...argConfig,
      type: cloneTypeTo(argConfig.type, anotherSchemaComposer, cloneMap),
      extensions: { ...argConfig.extensions },
    })) as any;

    return cloned;
  }

  // -----------------------------------------------
  // Extensions methods
  // -----------------------------------------------

  getExtensions(): Extensions {
    if (!this.extensions) {
      return {};
    } else {
      return this.extensions;
    }
  }

  setExtensions(extensions: Extensions): this {
    this.extensions = extensions;
    return this;
  }

  extendExtensions(extensions: Extensions): this {
    const current = this.getExtensions();
    this.setExtensions({
      ...current,
      ...extensions,
    });
    return this;
  }

  clearExtensions(): this {
    this.setExtensions({});
    return this;
  }

  getExtension(extensionName: string): unknown {
    const extensions = this.getExtensions();
    return extensions[extensionName];
  }

  hasExtension(extensionName: string): boolean {
    const extensions = this.getExtensions();
    return extensionName in extensions;
  }

  setExtension(extensionName: string, value: unknown): this {
    this.extendExtensions({
      [extensionName]: value,
    });
    return this;
  }

  removeExtension(extensionName: string): this {
    const extensions = { ...this.getExtensions() };
    delete extensions[extensionName];
    this.setExtensions(extensions);
    return this;
  }

  // -----------------------------------------------
  // Debug methods
  // -----------------------------------------------

  getNestedName(): string {
    const name = this.displayName || this.name;
    if (this.parent) {
      return `${name}(${this.parent.getNestedName()})`;
    }
    return name;
  }

  toString(): string {
    return inspect(this.toDebugStructure()).replace(/\\n/g, '\n');
  }

  setDisplayName(name: string): this {
    this.displayName = name;
    return this;
  }

  toDebugStructure(): Record<string, any> {
    const info: any = {
      name: this.name,
      displayName: this.displayName,
      type: inspect(this.type),
      args: this.args,
      resolve: this.resolve ? this.resolve.toString() : this.resolve,
    };
    if (this.parent) {
      info.resolve = [info.resolve, { 'Parent resolver': this.parent.toDebugStructure() }];
    }
    return info;
  }

  debugExecTime(): Resolver<TSource, TContext, TArgs> {
    return this.wrapResolve(
      (next) => async (rp) => {
        const name = `Execution time for ${this.getNestedName()}`;
        console.time(name);
        const res = await next(rp);
        console.timeEnd(name);
        return res;
      },
      'debugExecTime'
    );
  }

  debugParams(
    filterPaths?: string | string[] | undefined | null,
    opts: ResolverDebugOpts = { colors: true, depth: 5 }
  ): Resolver<TSource, TContext, TArgs> {
    return this.wrapResolve(
      (next) => (rp: any) => {
        console.log(`ResolverResolveParams for ${this.getNestedName()}:`);
        const data = filterByDotPaths(rp, filterPaths, {
          // is hidden (use debugParams(["info"])) or debug({ params: ["info"]})
          // `is hidden (use debugParams(["context.*"])) or debug({ params: ["context.*"]})`,
          hideFields:
            rp?.context && rp.context?.res && rp.context?.params && rp.context?.headers
              ? {
                  // looks like context is express request, collapse it
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
  }

  debugPayload(
    filterPaths?: string | string[] | undefined | null,
    opts: ResolverDebugOpts = { colors: true, depth: 5 }
  ): Resolver<TSource, TContext, TArgs> {
    return this.wrapResolve(
      (next) => async (rp) => {
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
  }

  debug(
    filterDotPaths?: {
      params?: string | string[] | undefined | null;
      payload?: string | string[] | undefined | null;
    },
    opts: ResolverDebugOpts = { colors: true, depth: 2 }
  ): Resolver<TSource, TContext, TArgs> {
    return this.debugExecTime()
      .debugParams(filterDotPaths ? filterDotPaths.params : null, opts)
      .debugPayload(filterDotPaths ? filterDotPaths.payload : null, opts);
  }
}
