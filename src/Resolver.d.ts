import {
    GraphQLFieldConfig, GraphQLFieldConfigArgumentMap, GraphQLInputType, GraphQLOutputType, GraphQLArgumentConfig
} from './graphql';
import * as graphql from './graphql';
import { SchemaComposer } from './SchemaComposer';
import {
    ComposeArgumentConfig, ComposeFieldConfigArgumentMap, ComposeOutputType, ComposeArgumentType
} from './TypeComposer';
import { InputTypeComposer } from './InputTypeComposer';
import { TypeComposer } from './TypeComposer';
import { ProjectionType } from './utils/projection';
import { GenericMap } from './utils/definitions';

export type ResolveParams<TSource, TContext> = {
    source: TSource,
    args: { [argName: string]: any },
    context: TContext,
    info: graphql.GraphQLResolveInfo,
    projection: Partial<ProjectionType>,
    [opt: string]: any,
};

export type ResolverKinds = 'query' | 'mutation' | 'subscription';

export type ResolverFilterArgFn<TSource, TContext> = (
    query: any,
    value: any,
    resolveParams: ResolveParams<TSource, TContext>) => any;

export type ResolverFilterArgConfig<TSource, TContext> = {
    name: string,
    type: ComposeArgumentType,
    description?: string,
    query?: ResolverFilterArgFn<TSource, TContext>
    filterTypeNameFallback?: string,
    defaultValue?: any,
};

export type ResolverSortArgFn = (resolveParams: ResolveParams<any, any>) => any;

export type ResolverSortArgConfig<TSource, TContext> = {
    name: string,
    sortTypeNameFallback?: string,
    value: ResolverSortArgFn | string | number | boolean | any[] | GenericMap<any>,
    deprecationReason?: string | null,
    description?: string | null,
};

export type ResolverOpts<TSource, TContext> = {
    type?: ComposeOutputType<TContext>,
    resolve?: ResolverRpCb<TSource, TContext>,
    args?: ComposeFieldConfigArgumentMap,
    name?: string,
    displayName?: string,
    kind?: ResolverKinds,
    description?: string,
    parent?: Resolver<TSource, TContext>,
};

export type ResolverWrapCb<TSource, TContext> = (
    newResolver: Resolver<TSource, TContext>,
    prevResolver: Resolver<TSource, TContext>) => Resolver<TSource, TContext>;

export type ResolverRpCb<TSource, TContext> = (
    resolveParams: Partial<ResolveParams<TSource, TContext>>) => Promise<any> | any;
export type ResolverNextRpCb<TSource, TContext> = (
    next: ResolverRpCb<TSource, TContext>) => ResolverRpCb<TSource, TContext>;

export type ResolverWrapArgsCb = (prevArgs: graphql.GraphQLFieldConfigArgumentMap) => ComposeFieldConfigArgumentMap;

export type ResolverWrapTypeCb = (prevType: graphql.GraphQLOutputType) => ComposeOutputType<any>;

export type ResolveDebugOpts = {
    showHidden?: boolean,
    depth?: number,
    colors?: boolean,
};

export class Resolver<TSource, TContext> {
    public static schemaComposer: SchemaComposer<any>;
    public schemaComposer: SchemaComposer<any>;

    public type: ComposeOutputType<TContext>;
    public args: ComposeFieldConfigArgumentMap;
    public resolve: ResolverRpCb<TSource, TContext>;
    public name: string;
    public displayName: string | null;
    public kind: ResolverKinds | null;
    public description: string | null;
    public parent: Resolver<TSource, TContext> | null;

    constructor(opts: ResolverOpts<TSource, TContext>);

    // -----------------------------------------------
    // Output type methods
    // -----------------------------------------------

    public getType(): GraphQLOutputType;

    public getTypeComposer(): TypeComposer<TContext>;

    public setType(gqType: ComposeOutputType<TContext>): this;

    // -----------------------------------------------
    // Args methods
    // -----------------------------------------------

    public hasArg(argName: string): boolean;

    public getArg(argName: string): ComposeArgumentConfig;

    public getArgConfig(argName: string): GraphQLArgumentConfig;

    public getArgType(argName: string): GraphQLInputType;

    public getArgTC(argName: string): InputTypeComposer;

    public getArgs(): ComposeFieldConfigArgumentMap;

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

    public addFilterArg(opts: ResolverFilterArgConfig<TSource, TContext>): Resolver<TSource, TContext>;

    public addSortArg(opts: ResolverSortArgConfig<TSource, TContext>): Resolver<TSource, TContext>;

    // -----------------------------------------------
    // Resolve methods
    // -----------------------------------------------

    public getResolve(): ResolverRpCb<TSource, TContext>;

    public setResolve(resolve: ResolverRpCb<TSource, TContext>): Resolver<TSource, TContext>;

    // -----------------------------------------------
    // Wrap methods
    // -----------------------------------------------

    public wrap(
        cb: ResolverWrapCb<TSource, TContext> | null,
        newResolverOpts: ResolverOpts<TSource, TContext> | null): Resolver<TSource, TContext>;

    public wrapResolve(cb: ResolverNextRpCb<TSource, TContext>, wrapperName?: string): Resolver<TSource, TContext>;

    public wrapArgs(cb: ResolverWrapArgsCb, wrapperName?: string): Resolver<TSource, TContext>;

    public wrapCloneArg(argName: string, newTypeName: string): Resolver<TSource, TContext>;

    public wrapType(cb: ResolverWrapTypeCb, wrapperName?: string): Resolver<TSource, TContext>;

    // -----------------------------------------------
    // Misc methods
    // -----------------------------------------------

    public getFieldConfig(opts?: { projection?: ProjectionType }): GraphQLFieldConfig<TSource, TContext>;

    public getKind(): ResolverKinds | null;

    public setKind(kind: string): this;

    public getDescription(): string | null;

    public setDescription(description: string): this;

    public get(path: string | string[]): any;

    public clone(opts?: ResolverOpts<TSource, TContext>): Resolver<TSource, TContext>;

    // -----------------------------------------------
    // Debug methods
    // -----------------------------------------------

    public getNestedName(): string;

    public toString(colors?: boolean): string;

    public setDisplayName(name: string): this;

    public toDebugStructure(colors?: boolean): object;

    public debugExecTime(): Resolver<TSource, TContext>;

    public debugParams(filterPaths: (string | string[]) | null, opts?: ResolveDebugOpts): Resolver<TSource, TContext>;

    public debugPayload(filterPaths: (string | string[]) | null, opts?: ResolveDebugOpts): Resolver<TSource, TContext>;

    public debug(
        filterDotPaths?: { params?: (string | string[]), payload?: (string | string[]) },
        opts?: ResolveDebugOpts): Resolver<TSource, TContext>;
}
