/// <reference types="graphql" />
import {
    GraphQLArgumentConfig, GraphQLFieldConfig, GraphQLFieldConfigArgumentMap, GraphQLInputType, GraphQLOutputType
} from 'graphql';
import {
    ComposeArgumentConfig, ComposeFieldConfigArgumentMap, ComposeOutputType, ProjectionType, ResolverFilterArgConfig,
    ResolverKinds, ResolverMWResolve, ResolverMWResolveFn, ResolverOpts, ResolverSortArgConfig, ResolverWrapArgsFn,
    ResolverWrapFn, ResolverWrapTypeFn
} from './definition';
import InputTypeComposer from './inputTypeComposer';
import TypeComposer from './typeComposer';

export interface ResolveDebugOpts {
    showHidden?: boolean;
    depth?: number;
    colors?: boolean;
}

export default class Resolver<TSource, TContext> {
    public type: GraphQLOutputType;
    public args: GraphQLFieldConfigArgumentMap;
    public resolve: ResolverMWResolveFn<TSource, TContext>;
    public name: string;
    public displayName: string | null;
    public kind: ResolverKinds | null;
    public description: string | null;
    public parent: Resolver<TSource, TContext> | null;

    constructor(opts: ResolverOpts<TSource, TContext>);

    public hasArg(argName: string): boolean;

    public getArg(argName: string): GraphQLArgumentConfig;

    public getArgType(argName: string): GraphQLInputType;

    public getArgTC(argName: string): InputTypeComposer;

    public getArgs(): GraphQLFieldConfigArgumentMap;

    public getArgNames(): string[];

    public setArgs(args: ComposeFieldConfigArgumentMap): this;

    public setArg(argName: string, argConfig: ComposeArgumentConfig): this;

    public addArgs(newArgs: ComposeFieldConfigArgumentMap): this;

    public removeArg(argNameOrArray: string | string[]): this;

    public removeOtherArgs(argNameOrArray: string | string[]): this;

    public reorderArgs(names: string[]): this;

    public cloneArg(argName: string, newTypeName: string): this;

    public isRequired(argName: string): boolean;

    public makeRequired(argNameOrArray: string | string[]): this;

    public makeOptional(argNameOrArray: string | string[]): this;

    public getResolve(): ResolverMWResolveFn<TSource, TContext>;

    public setResolve(resolve: ResolverMWResolveFn<TSource, TContext>): Resolver<TSource, TContext>;

    public getType(): GraphQLOutputType;

    public getTypeComposer(): TypeComposer | null;

    public setType(gqType: ComposeOutputType): this;

    public getFieldConfig(opts?: { projection?: ProjectionType }): GraphQLFieldConfig<TSource, TContext>;

    public getKind(): ResolverKinds | null;

    public setKind(kind: string): this;

    public getDescription(): string | null;

    public setDescription(description: string): this;

    public get(path: string | string[]): any;

    public clone(opts?: ResolverOpts<TSource, TContext>): Resolver<TSource, TContext>;

    public wrap(
        cb: ResolverWrapFn<TSource, TContext> | null,
        newResolverOpts: ResolverOpts<TSource, TContext> | null): Resolver<TSource, TContext>;

    public wrapResolve(cb: ResolverMWResolve<TSource, TContext>, wrapperName?: string): Resolver<TSource, TContext>;

    public wrapArgs(cb: ResolverWrapArgsFn, wrapperName?: string): Resolver<TSource, TContext>;

    public wrapCloneArg(argName: string, newTypeName: string): Resolver<TSource, TContext>;

    public wrapType(cb: ResolverWrapTypeFn, wrapperName?: string): Resolver<TSource, TContext>;

    public addFilterArg(opts: ResolverFilterArgConfig<TSource, TContext>): Resolver<TSource, TContext>;

    public addSortArg(opts: ResolverSortArgConfig<TSource, TContext>): Resolver<TSource, TContext>;

    public getNestedName(): string;

    public toStringOld(): string;

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
