/* @flow */
/* eslint-disable */

import type {
  GraphQLFieldConfigArgumentMap as _GraphQLFieldConfigArgumentMap,
  GraphQLFieldResolver as _GraphQLFieldResolver,
  GraphQLResolveInfo as _GraphQLResolveInfo,
  GraphQLArgumentConfig as _GraphQLArgumentConfig,
  GraphQLOutputType as _GraphQLOutputType,
  GraphQLNamedType as _GraphQLNamedType,
  GraphQLObjectType as _GraphQLObjectType,
  GraphQLObjectTypeConfig as _GraphQLObjectTypeConfig,
  GraphQLInputObjectType as _GraphQLInputObjectType,
  GraphQLFieldConfig as _GraphQLFieldConfig,
  GraphQLFieldConfigMap as _GraphQLFieldConfigMap,
  GraphQLType as _GraphQLType,
  GraphQLInputObjectTypeConfig as _GraphQLInputObjectTypeConfig,
  GraphQLInputField as _GraphQLInputField,
  GraphQLInputFieldConfig as _GraphQLInputFieldConfig,
  GraphQLInputFieldConfigMap as _GraphQLInputFieldConfigMap,
  GraphQLInterfaceType as _GraphQLInterfaceType,
  GraphQLInputType as _GraphQLInputType,
  GraphQLNullableType as _GraphQLNullableType,
} from 'graphql/type/definition';

import type TypeComposer from './typeComposer';
import type Resolver from './resolver';
import type InputTypeComposer from './inputTypeComposer';

export type Thunk<T> = (() => T) | T;
export type ObjectMap = { [optName: string]: mixed };
export type ProjectionType = { [fieldName: string]: true | ProjectionType };
export type ProjectionMapType = { [relationfieldName: string]: ProjectionType };

// TypeMapper
export type TypeDefinitionString = string;
export type TypeWrappedString = string; // eg. Int, Int!, [Int]
export type TypeNameString = string; // eg. Int, Float

// GRAPHQL RE-EXPORT --------------------
export type GraphQLType = _GraphQLType;
export type GraphQLObjectType = _GraphQLObjectType;
export type GraphQLObjectTypeConfig = _GraphQLObjectTypeConfig<*, *>;
export type GraphQLNullableType = _GraphQLNullableType;
export type GraphQLInterfaceType = _GraphQLInterfaceType;
export type GraphQLOutputType = _GraphQLOutputType;
export type GraphQLInputField = _GraphQLInputField;
export type GraphQLInputObjectType = _GraphQLInputObjectType;
export type GraphQLInputObjectTypeConfig = _GraphQLInputObjectTypeConfig;
export type GraphQLFieldConfigArgumentMap = _GraphQLFieldConfigArgumentMap;
export type GraphQLFieldResolver<TSource, TContext> = _GraphQLFieldResolver<TSource, TContext>;
export type GraphQLResolveInfo = _GraphQLResolveInfo;
export type GraphQLArgumentConfig = _GraphQLArgumentConfig;
export type GraphQLNamedType = _GraphQLNamedType;
export type GraphQLFieldConfig<TSource, TContext> = _GraphQLFieldConfig<TSource, TContext>;
export type GraphQLFieldConfigMap<TSource, TContext> = _GraphQLFieldConfigMap<TSource, TContext>;
export type ResolveParams<TSource, TContext> = {
  source: TSource,
  args: {[argName: string]: mixed},
  context: TContext,
  info: GraphQLResolveInfo,
  projection: ProjectionType,
  [opt: string]: mixed,
};
export type GraphQLInputFieldConfig = _GraphQLInputFieldConfig;
export type GraphQLInputFieldConfigMap = _GraphQLInputFieldConfigMap;
export type GraphQLInputType = _GraphQLInputType;
export type GraphQLComposeOutputType<TSource, TContext> = GraphQLOutputType
  | TypeComposer
  | TypeWrappedString
  | TypeDefinitionString
  | TypeNameString
  | Resolver<TSource, TContext>
  | GraphQLFieldConfig<TSource, TContext>;


export type GraphQLObjectTypeExtended = GraphQLObjectType & {
  _gqcInputTypeComposer?: InputTypeComposer,
  _gqcResolvers?: Map<string, Resolver<*, *>>,
  _gqcGetRecordIdFn?: GetRecordIdFn<*, *>,
  _gqcProjectionMapper?: ProjectionMapType,
  _gqcRelations?: RelationThunkMap<*, *>,
  description: ?string,
};

// RELATION -----------------------------
export type RelationThunkMap<TSource, TContext> = { [fieldName: string]: Thunk<RelationOpts<TSource, TContext>> };
export type RelationOpts<TSource, TContext> =
  RelationOptsWithResolver<TSource, TContext> |
  RelationOptsWithFieldConfig<TSource, TContext>;
export type RelationOptsWithResolver<TSource, TContext> = {
  resolver: Resolver<TSource, TContext>,
  args?: RelationArgsMapper<TSource, TContext>,
  projection?: ProjectionType,
  description?: ?string,
  deprecationReason?: ?string,
  catchErrors?: boolean,
}
export type RelationOptsWithFieldConfig<TSource, TContext> = {
  type: GraphQLOutputType,
  args?: GraphQLFieldConfigArgumentMap,
  resolve: GraphQLFieldResolver<TSource, TContext>,
  projection?: ProjectionType,
  description?: ?string,
  deprecationReason?: ?string,
}
export type ArgsType = { [argName: string]: mixed };
export type RelationArgsMapperFn<TSource, TContext> = (source: TSource, args: ArgsType, context: TContext, info: GraphQLResolveInfo) => ArgsType;
export type RelationArgsMapper<TSource, TContext> = {
  [argName: string]: RelationArgsMapperFn<TSource, TContext> | null | void | mixed,
};

// RESOLVER -----------------------------
export type ResolverMWMethodKeys = 'args' | 'resolve' | 'type';
export type ResolverKinds = 'query' | 'mutation' | 'subscription';

export type ResolverMWArgsFn = (args: GraphQLFieldConfigArgumentMap) => GraphQLFieldConfigArgumentMap;
export type ResolverMWArgs = (next: ResolverMWArgsFn) => ResolverMWArgsFn;

export type ResolverMWResolveFn<TSource, TContext> = (resolveParams: ResolveParams<TSource, TContext>) => Promise<*>;
export type ResolverMWResolve<TSource, TContext> = (next: ResolverMWResolveFn<TSource, TContext>) => ResolverMWResolveFn<TSource, TContext>;

export type ResolverMWOutputTypeFn = (outputType: GraphQLOutputType) => GraphQLOutputType;
export type ResolverMWOutputType = (next: ResolverMWOutputTypeFn) => ResolverMWOutputTypeFn;

export type ResolverFieldConfig<TSource, TContext> = {
  type: GraphQLOutputType,
  args: GraphQLFieldConfigArgumentMap,
  resolve: GraphQLFieldResolver<TSource, TContext>,
  subscribe?: GraphQLFieldResolver<TSource, TContext>;
  deprecationReason?: ?string;
  description?: ?string;
};

export type GetRecordIdFn<TSource, TContext> = (source: TSource, args: ?mixed, context: TContext) => string;

export type ResolverFilterArgFn<TSource, TContext> = (query: mixed, value: mixed, resolveParams: ResolveParams<TSource, TContext>) => any;

export type ResolverFilterArgConfig<TSource, TContext> = {
  name: string,
  type: string | GraphQLInputObjectType,
  description: string,
  query: ResolverFilterArgFn<TSource, TContext>,
  filterTypeNameFallback?: string,
};

export type ResolverSortArgFn<TSource, TContext> = (resolveParams: ResolveParams<TSource, TContext>) => any;

export type ResolverSortArgConfig<TSource, TContext> = {
  name: string,
  sortTypeNameFallback?: string,
  value: ResolverSortArgFn<TSource, TContext> | mixed;
  deprecationReason?: ?string;
  description?: ?string;
};

export type ResolverOpts<TSource, TContext> = {
  type?: GraphQLOutputType,
  resolve?: ResolverMWResolveFn<TSource, TContext>,
  args?: GraphQLFieldConfigArgumentMap,
  name?: string,
  kind?: ResolverKinds,
  description?: string,
  parent?: Resolver<TSource, TContext>,
};

export type ResolverWrapFn<TSource, TContext> = (
  newResolver: Resolver<TSource, TContext>,
  prevResolver: Resolver<TSource, TContext>
) => Resolver<TSource, TContext>;

export type ResolverWrapArgsFn =
  (prevArgs: GraphQLFieldConfigArgumentMap) => GraphQLFieldConfigArgumentMap;
export type ResolverWrapTypeFn =
  (prevType: GraphQLOutputType) => GraphQLOutputType;
