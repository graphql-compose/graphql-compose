import {
  GraphQLArgumentConfig,
  GraphQLFieldConfig,
  GraphQLInputType,
  GraphQLOutputType,
  GraphQLResolveInfo,
  GraphQLFieldConfigArgumentMap,
} from 'graphql';
import * as graphql from './graphql';
import { InputTypeComposer } from './InputTypeComposer';
import { SchemaComposer } from './SchemaComposer';
import {
  ComposeArgumentConfig,
  ComposeArgumentType,
  ComposeArgumentConfigAsObject,
  ComposeFieldConfigArgumentMap,
  ComposeOutputType,
  ObjectTypeComposer,
  ArgsMap,
} from './ObjectTypeComposer';
import { ProjectionType } from './utils/projection';

export type ResolveParams<TSource, TContext, TArgs = ArgsMap> = {
  source: TSource;
  args: TArgs;
  context: TContext;
  info: GraphQLResolveInfo;
  projection: Partial<ProjectionType>;
  [opt: string]: any;
};

export type ResolverKinds = 'query' | 'mutation' | 'subscription';

export type ResolverFilterArgFn<TSource, TContext, TArgs> = (
  query: any,
  value: any,
  resolveParams: ResolveParams<TSource, TContext, TArgs>,
) => any;

export type ResolverFilterArgConfig<TSource, TContext, TArgs> = {
  name: string;
  type: ComposeArgumentType;
  description?: string;
  query?: ResolverFilterArgFn<TSource, TContext, TArgs>;
  filterTypeNameFallback?: string;
  defaultValue?: any;
};

export type ResolverSortArgFn<TSource, TContext, TArgs> = (
  resolveParams: ResolveParams<TSource, TContext, TArgs>,
) => any;

export type ResolverSortArgConfig<TSource, TContext, TArgs> = {
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

export type ResolverOpts<TSource, TContext, TArgs = ArgsMap> = {
  type?: ComposeOutputType<any, TContext>;
  resolve?: ResolverRpCb<TSource, TContext, TArgs>;
  args?: ComposeFieldConfigArgumentMap<TArgs>;
  name?: string;
  displayName?: string;
  kind?: ResolverKinds;
  description?: string;
  parent?: Resolver<TSource, TContext, ArgsMap>;
};

export type ResolverWrapCb<
  TNewSource,
  TPrevSource,
  TContext,
  TNewArgs = ArgsMap,
  TPrevArgs = ArgsMap
> = (
  newResolver: Resolver<TNewSource, TContext, TNewArgs>,
  prevResolver: Resolver<TPrevSource, TContext, TPrevArgs>,
) => Resolver<TNewSource, TContext, TNewArgs>;

export type ResolverRpCb<TSource, TContext, TArgs = ArgsMap> = (
  resolveParams: ResolveParams<TSource, TContext, TArgs>,
) => Promise<any> | any;
export type ResolverNextRpCb<TSource, TContext, TArgs = ArgsMap> = (
  next: ResolverRpCb<TSource, TContext, TArgs>,
) => ResolverRpCb<TSource, TContext, TArgs>;

export type ResolverWrapArgsCb<TArgs> = (
  prevArgs: GraphQLFieldConfigArgumentMap,
) => ComposeFieldConfigArgumentMap<TArgs>;

export type ResolverWrapTypeCb<TContext> = (
  prevType: GraphQLOutputType,
) => ComposeOutputType<any, TContext>;

export type ResolveDebugOpts = {
  showHidden?: boolean;
  depth?: number;
  colors?: boolean;
};

export type ResolverMiddleware<TSource, TContext, TArgs> = (
  resolve: (
    source: TSource,
    args: TArgs,
    context: TContext,
    info: GraphQLResolveInfo,
  ) => any,
  source: TSource,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => any;

export class Resolver<TSource = any, TContext = any, TArgs = ArgsMap> {
  public static schemaComposer: SchemaComposer<any>;
  public schemaComposer: SchemaComposer<TContext>;

  public type: ComposeOutputType<any, TContext>;
  public args: ComposeFieldConfigArgumentMap<any>;
  public resolve: ResolverRpCb<TSource, TContext, TArgs>;
  public name: string;
  public displayName: string | null;
  public kind: ResolverKinds | null;
  public description: string | null;
  public parent: Resolver<TSource, TContext, any> | null;

  constructor(opts: ResolverOpts<TSource, TContext, TArgs>);

  // -----------------------------------------------
  // Output type methods
  // -----------------------------------------------

  public getType(): GraphQLOutputType;

  public getTypeComposer(): ObjectTypeComposer<any, TContext>;

  public setType(gqType: ComposeOutputType<any, TContext>): this;

  // -----------------------------------------------
  // Args methods
  // -----------------------------------------------

  public hasArg(argName: string): boolean;

  public getArg(argName: string): ComposeArgumentConfig;

  public getArgConfig(argName: string): GraphQLArgumentConfig;

  public getArgType(argName: string): GraphQLInputType;

  public getArgTC(argName: string): InputTypeComposer;

  public getArgs(): ComposeFieldConfigArgumentMap<TArgs>;

  public getArgNames(): string[];

  public setArgs(args: ComposeFieldConfigArgumentMap<TArgs>): this;

  public setArg(argName: string, argConfig: ComposeArgumentConfig): this;

  public extendArg(
    argName: string,
    partialArgConfig: ComposeArgumentConfigAsObject,
  ): this;

  public addArgs(newArgs: ComposeFieldConfigArgumentMap<TArgs>): this;

  public removeArg(argNameOrArray: string | string[]): this;

  public removeOtherArgs(argNameOrArray: string | string[]): this;

  public reorderArgs(names: string[]): this;

  public cloneArg(argName: string, newTypeName: string): this;

  public isRequired(argName: string): boolean;

  public makeRequired(argNameOrArray: string | string[]): this;

  public makeOptional(argNameOrArray: string | string[]): this;

  public addFilterArg(
    opts: ResolverFilterArgConfig<TSource, TContext, TArgs>,
  ): Resolver<TSource, TContext, TArgs>;

  public addSortArg(
    opts: ResolverSortArgConfig<TSource, TContext, TArgs>,
  ): Resolver<TSource, TContext, TArgs>;

  // -----------------------------------------------
  // Resolve methods
  // -----------------------------------------------

  public getResolve(): ResolverRpCb<TSource, TContext, TArgs>;

  public setResolve(
    resolve: ResolverRpCb<TSource, TContext, TArgs>,
  ): Resolver<TSource, TContext, TArgs>;

  // -----------------------------------------------
  // Wrap methods
  // -----------------------------------------------

  public withMiddlewares(
    middlewares: Array<ResolverMiddleware<TSource, TContext, TArgs>>,
  ): Resolver<TSource, TContext, TArgs>;

  public wrap<TCSource = TSource, TCArgs = TArgs>(
    cb?: ResolverWrapCb<TCSource, TSource, TContext, TCArgs, TArgs>,
    newResolverOpts?: ResolverOpts<TCSource, TContext, TArgs>,
  ): Resolver<TCSource, TContext, TCArgs>;

  public wrapResolve<TCSource = TSource, TCArgs = TArgs>(
    cb: ResolverNextRpCb<TCSource, TContext, TCArgs>,
    wrapperName?: string,
  ): Resolver<TCSource, TContext, TCArgs>;

  public wrapArgs(
    cb: ResolverWrapArgsCb<TArgs>,
    wrapperName?: string,
  ): Resolver<TSource, TContext, TArgs>;

  public wrapCloneArg<TCArgs = TArgs>(
    argName: string,
    newTypeName: string,
  ): Resolver<TSource, TContext, TCArgs>;

  public wrapType(
    cb: ResolverWrapTypeCb<TContext>,
    wrapperName?: string,
  ): Resolver<TSource, TContext, TArgs>;

  // -----------------------------------------------
  // Misc methods
  // -----------------------------------------------

  public getFieldConfig(opts?: {
    projection?: ProjectionType;
  }): GraphQLFieldConfig<TSource, TContext, TArgs>;

  public getKind(): ResolverKinds | null;

  public setKind(kind: string): this;

  public getDescription(): string | null;

  public setDescription(description: string): this;

  public get(path: string | string[]): any;

  public clone<TCloneSource = TSource, TCContext = TContext, TCArgs = TArgs>(
    opts?: ResolverOpts<TSource, TContext, TCArgs>,
  ): Resolver<TCloneSource, TContext, TCArgs>;

  // -----------------------------------------------
  // Debug methods
  // -----------------------------------------------

  public getNestedName(): string;

  public toString(colors?: boolean): string;

  public setDisplayName(name: string): this;

  public toDebugStructure(colors?: boolean): object;

  public debugExecTime(): Resolver<TSource, TContext, TArgs>;

  public debugParams(
    filterPaths: (string | string[]) | null,
    opts?: ResolveDebugOpts,
  ): Resolver<TSource, TContext, TArgs>;

  public debugPayload(
    filterPaths: (string | string[]) | null,
    opts?: ResolveDebugOpts,
  ): Resolver<TSource, TContext, TArgs>;

  public debug(
    filterDotPaths?: {
      params?: string | string[];
      payload?: string | string[];
    },
    opts?: ResolveDebugOpts,
  ): Resolver<TSource, TContext, TArgs>;
}
