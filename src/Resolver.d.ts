import {
  GraphQLArgumentConfig,
  GraphQLFieldConfig,
  GraphQLInputType,
  GraphQLOutputType,
} from 'graphql';
import * as graphql from './graphql';
import { InputTypeComposer } from './InputTypeComposer';
import { SchemaComposer } from './SchemaComposer';
import {
  ComposeArgumentConfig,
  ComposeArgumentType,
  ComposeFieldConfigArgumentMap,
  ComposeOutputType,
  TypeComposer,
} from './TypeComposer';
import { GenericMap } from './utils/definitions';
import { ProjectionType } from './utils/projection';

export type ResolveParams<TSource, TContext, TArgs = any> = {
  source: TSource;
  args: { [argName in keyof TArgs]: TArgs[argName] };
  context: TContext;
  info: graphql.GraphQLResolveInfo;
  projection: Partial<ProjectionType<TSource>>;
  [opt: string]: any;
};

export type ResolverKinds = 'query' | 'mutation' | 'subscription';

export type ResolverFilterArgFn<TSource, TContext> = (
  query: any,
  value: any,
  resolveParams: ResolveParams<TSource, TContext>,
) => any;

export type ResolverFilterArgConfig<TSource, TContext> = {
  name: string;
  type: ComposeArgumentType;
  description?: string;
  query?: ResolverFilterArgFn<TSource, TContext>;
  filterTypeNameFallback?: string;
  defaultValue?: any;
};

export type ResolverSortArgFn = (resolveParams: ResolveParams<any, any>) => any;

export type ResolverSortArgConfig<TSource, TContext> = {
  name: string;
  sortTypeNameFallback?: string;
  value:
    | ResolverSortArgFn
    | string
    | number
    | boolean
    | any[]
    | GenericMap<any>;
  deprecationReason?: string | null;
  description?: string | null;
};

export type ResolverOpts<TSource, TContext, TArgs = any> = {
  type?: ComposeOutputType<TSource, TContext>;
  resolve?: ResolverRpCb<TSource, TContext, TArgs>;
  args?: ComposeFieldConfigArgumentMap<TArgs>;
  name?: string;
  displayName?: string;
  kind?: ResolverKinds;
  description?: string;
  parent?: Resolver<TSource, TContext, TArgs>;
};

export type ResolverWrapCb<
  TNewSource,
  TPrevSource,
  TContext,
  TNewArgs = any,
  TPrevArgs = any
> = (
  newResolver: Resolver<TNewSource, TContext, TNewArgs>,
  prevResolver: Resolver<TPrevSource, TContext, TPrevArgs>,
) => Resolver<TNewSource, TContext, TNewArgs>;

export type ResolverRpCb<TSource, TContext, TArgs = any> = (
  resolveParams: Partial<ResolveParams<TSource, TContext, TArgs>>,
) => Promise<any> | any;
export type ResolverNextRpCb<TSource, TContext, TArgs = any> = (
  next: ResolverRpCb<TSource, TContext, TArgs>,
) => ResolverRpCb<TSource, TContext, TArgs>;

export type ResolverWrapArgsCb = (
  prevArgs: graphql.GraphQLFieldConfigArgumentMap,
) => ComposeFieldConfigArgumentMap;

export type ResolverWrapTypeCb = (
  prevType: graphql.GraphQLOutputType,
) => ComposeOutputType<any, any>;

export type ResolveDebugOpts = {
  showHidden?: boolean;
  depth?: number;
  colors?: boolean;
};

export class Resolver<TSource = any, TContext = any, TArgs = any> {
  public static schemaComposer: SchemaComposer<any>;
  public schemaComposer: SchemaComposer<TContext>;

  public type: ComposeOutputType<TSource, TContext>;
  public args: ComposeFieldConfigArgumentMap<TArgs>;
  public resolve: ResolverRpCb<TSource, TContext, TArgs>;
  public name: string;
  public displayName: string | null;
  public kind: ResolverKinds | null;
  public description: string | null;
  public parent: Resolver<TSource, TContext, TArgs> | null;

  constructor(opts: ResolverOpts<TSource, TContext, TArgs>);

  // -----------------------------------------------
  // Output type methods
  // -----------------------------------------------

  public getType(): GraphQLOutputType;

  public getTypeComposer(): TypeComposer<TSource, TContext>;

  public setType(gqType: ComposeOutputType<TSource, TContext>): this;

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

  public setArgs(args: ComposeFieldConfigArgumentMap): this;

  public setArg(argName: string, argConfig: ComposeArgumentConfig): this;

  public extendArg(argName: string, partialArgConfig: any): this;

  public addArgs(newArgs: ComposeFieldConfigArgumentMap): this;

  public removeArg(argNameOrArray: string | string[]): this;

  public removeOtherArgs(argNameOrArray: string | string[]): this;

  public reorderArgs(names: string[]): this;

  public cloneArg(argName: string, newTypeName: string): this;

  public isRequired(argName: string): boolean;

  public makeRequired(argNameOrArray: string | string[]): this;

  public makeOptional(argNameOrArray: string | string[]): this;

  public addFilterArg(
    opts: ResolverFilterArgConfig<TSource, TContext>,
  ): Resolver<TSource, TContext>;

  public addSortArg(
    opts: ResolverSortArgConfig<TSource, TContext>,
  ): Resolver<TSource, TContext>;

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

  public wrap<TCSource = TSource, TCArgs = TArgs>(
    cb?: ResolverWrapCb<TCSource, TSource, TContext, TCArgs, TArgs>,
    newResolverOpts?: ResolverOpts<TCSource, TContext, TArgs>,
  ): Resolver<TCSource, TContext, TCArgs>;

  public wrapResolve<TCSource = TSource, TCArgs = TArgs>(
    cb: ResolverNextRpCb<TCSource, TContext, TCArgs>,
    wrapperName?: string,
  ): Resolver<TCSource, TContext, TCArgs>;

  public wrapArgs(
    cb: ResolverWrapArgsCb,
    wrapperName?: string,
  ): Resolver<TSource, TContext, TArgs>;

  public wrapCloneArg<TCArgs = TArgs>(
    argName: string,
    newTypeName: string,
  ): Resolver<TSource, TContext, TCArgs>;

  public wrapType(
    cb: ResolverWrapTypeCb,
    wrapperName?: string,
  ): Resolver<TSource, TContext, TArgs>;

  // -----------------------------------------------
  // Misc methods
  // -----------------------------------------------

  public getFieldConfig(opts?: {
    projection?: ProjectionType<TSource>;
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
