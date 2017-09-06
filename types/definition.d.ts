// tslint:disable:interface-over-type-literal to keep the file close to the original
/// <reference types="graphql" />
import * as graphql from 'graphql';
import InputTypeComposer from './inputTypeComposer';
import Resolver from './resolver';
import TypeComposer from './typeComposer';

export type Thunk<T> = (() => T) | T;
export type ObjectMap = { [optName: string]: any };

export type ProjectionType = { [fieldName: string]: any };
export type ProjectionNode = { [fieldName: string]: any };
export type ProjectionMapType = { [relationfieldName: string]: ProjectionType };

export type TypeDefinitionString = string;
export type TypeWrappedString = string; // eg. Int, Int!, [Int]
export type TypeNameString = string; // eg. Int, Float

export {
    GraphQLType, GraphQLScalarType, GraphQLObjectType, GraphQLObjectTypeConfig, GraphQLNullableType,
    GraphQLInterfaceType, GraphQLOutputType, GraphQLInputField, GraphQLInputObjectType, GraphQLInputObjectTypeConfig,
    GraphQLFieldConfigArgumentMap, GraphQLFieldResolver, GraphQLResolveInfo, GraphQLArgumentConfig, GraphQLNamedType,
    GraphQLFieldConfig, GraphQLFieldConfigMap, GraphQLInputFieldConfig, GraphQLInputFieldConfigMap, GraphQLInputType,
    GraphQLEnumType, GraphQLEnumTypeConfig, GraphQLEnumValueConfigMap, GraphQLEnumValueConfig, GraphQLEnumValue
} from 'graphql';

export type ComposeFieldConfigMap<TSource, TContext> = {
    [fieldName: string]: | ComposeFieldConfig<TSource, TContext>
        | Array<ComposeFieldConfig<TSource, TContext>>
        | graphql.GraphQLFieldConfig<TSource, TContext>,
} | graphql.GraphQLFieldConfigMap<TSource, TContext>;

export type ComposeFieldConfig<TSource, TContext> = {
    type: ComposeOutputType | ComposeOutputType[],
    args?: ComposeFieldConfigArgumentMap,
    resolve?: graphql.GraphQLFieldResolver<TSource, TContext>,
    subscribe?: graphql.GraphQLFieldResolver<TSource, TContext>,
    deprecationReason?: string | null,
    description?: string | null,
} | ComposeOutputType | graphql.GraphQLFieldConfig<TSource, TContext>;

export type ComposeOutputType =
    | graphql.GraphQLOutputType
    | TypeComposer
    | TypeWrappedString
    | TypeDefinitionString
    | TypeNameString
    | Resolver<any, any>
    | (() => ComposeOutputType);

export type ComposeInputFieldConfigMap = {
    [fieldName: string]: | ComposeInputFieldConfig
        | ComposeInputFieldConfig[]
        | graphql.GraphQLInputFieldConfig,
} | graphql.GraphQLInputFieldConfigMap;

export type ComposeInputFieldConfig = {
    type: ComposeInputType | ComposeInputType[],
    defaultValue?: any,
    description?: string | null,
} | ComposeInputType | graphql.GraphQLInputFieldConfig;

export type ComposeInputType =
    | InputTypeComposer
    | graphql.GraphQLInputType
    | TypeWrappedString
    | TypeDefinitionString
    | TypeNameString
    | (() => ComposeInputType);

export type ComposeArgumentType =
    | graphql.GraphQLInputType
    | string
    | InputTypeComposer
    | graphql.GraphQLArgumentConfig
    | (() => ComposeArgumentType);

export type ComposeArgumentConfig = {
    type: ComposeArgumentType,
    defaultValue?: any,
    description?: string | null,
} | ComposeArgumentType | (() => ComposeArgumentConfig);

export type ComposeFieldConfigArgumentMap = {
    [argName: string]: ComposeArgumentConfig | ComposeArgumentConfig[],
};

export type ComposeObjectTypeConfig<TSource, TContext> = {
    name: string,
    interfaces?: Thunk<graphql.GraphQLInterfaceType[] | null>,
    fields?: Thunk<ComposeFieldConfigMap<TSource, TContext>>,
    isTypeOf?: graphql.GraphQLIsTypeOfFn<TSource, TContext> | null,
    description?: string | null,
    isIntrospection?: boolean,
};

export type ComposeInputObjectTypeConfig = {
    name: string,
    fields: Thunk<ComposeInputFieldConfigMap>,
    description?: string | null,
};

export type GraphQLObjectTypeExtended = graphql.GraphQLObjectType & {
    _gqcInputTypeComposer?: InputTypeComposer,
    _gqcResolvers?: Map<string, Resolver<any, any>>,
    _gqcGetRecordIdFn?: GetRecordIdFn<any, any>,
    _gqcProjectionMapper?: ProjectionMapType,
    _gqcRelations?: RelationThunkMap<any, any>,
    description: string | null,
};

export type RelationThunkMap<TSource, TContext> = {
    [fieldName: string]: Thunk<RelationOpts<TSource, TContext>>,
};

export type RelationOpts<TSource, TContext> =
    | RelationOptsWithResolver<TSource, TContext>
    | RelationOptsWithFieldConfig<TSource, TContext>;

export type RelationOptsWithResolver<TSource, TContext> = {
    resolver: Thunk<Resolver<TSource, TContext>>,
    prepareArgs?: RelationArgsMapper<TSource, TContext>,
    projection?: ProjectionType,
    description?: string | null,
    deprecationReason?: string | null,
    catchErrors?: boolean,
};

export type RelationOptsWithFieldConfig<TSource, TContext> = {
    type: ComposeOutputType,
    args?: ComposeFieldConfigArgumentMap,
    resolve: graphql.GraphQLFieldResolver<TSource, TContext>,
    projection?: ProjectionType,
    description?: string | null,
    deprecationReason?: string | null,
};

export type ArgsType = { [argName: string]: any };

export type RelationArgsMapperFn<TSource, TContext> = (
    source: TSource,
    args: ArgsType,
    context: TContext,
    info: graphql.GraphQLResolveInfo) => any;

export type RelationArgsMapper<TSource, TContext> = {
    [argName: string]: | RelationArgsMapperFn<TSource, TContext>
        | null
        | void
        | string
        | number
        | any[]
        | object
};

export type ResolveParams<TSource, TContext> = {
    source: TSource,
    args: { [argName: string]: any },
    context: TContext,
    info: graphql.GraphQLResolveInfo,
    projection: Partial<ProjectionType>,
    [opt: string]: any,
};

export type ResolverMWMethodKeys = 'args' | 'resolve' | 'type';
export type ResolverKinds = 'query' | 'mutation' | 'subscription';

export type ResolverMWArgsFn = (args: graphql.GraphQLFieldConfigArgumentMap) => graphql.GraphQLFieldConfigArgumentMap;

export type ResolverMWArgs = (next: ResolverMWArgsFn) => ResolverMWArgsFn;

export type ResolverNextRpCbFn<TSource, TContext> = (
    resolveParams: Partial<ResolveParams<TSource, TContext>>) => Promise<any> | any;

export type ResolverNextRpCb<TSource, TContext> = (
    next: ResolverNextRpCbFn<TSource, TContext>) => ResolverNextRpCbFn<TSource, TContext>;

export type ResolverMWOutputTypeFn = (outputType: graphql.GraphQLOutputType) => graphql.GraphQLOutputType;

export type ResolverMWOutputType = (next: ResolverMWOutputTypeFn) => ResolverMWOutputTypeFn;

export type GetRecordIdFn<TSource, TContext> = (source: TSource, args: any, context: TContext) => string;

export type ResolverFilterArgFn<TSource, TContext> = (
    query: any,
    value: any,
    resolveParams: ResolveParams<TSource, TContext>) => any;

export type ResolverFilterArgConfig<TSource, TContext> = {
    name: string,
    type: ComposeArgumentType,
    description?: string,
    query: ResolverFilterArgFn<TSource, TContext>,
    filterTypeNameFallback?: string,
};

export type ResolverSortArgFn = (resolveParams: ResolveParams<any, any>) => any;

export type ResolverSortArgConfig<TSource, TContext> = {
    name: string,
    sortTypeNameFallback?: string,
    value: ResolverSortArgFn | string | number | boolean,
    deprecationReason?: string | null,
    description?: string | null,
};

export type ResolverOpts<TSource, TContext> = {
    type?: ComposeOutputType,
    resolve?: ResolverNextRpCbFn<TSource, TContext>,
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

export type ResolverWrapArgsFn = (prevArgs: graphql.GraphQLFieldConfigArgumentMap) => ComposeFieldConfigArgumentMap;

export type ResolverWrapTypeFn = (prevType: graphql.GraphQLOutputType) => graphql.GraphQLOutputType;
