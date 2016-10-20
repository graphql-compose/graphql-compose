/* @flow */
/* eslint-disable */

import type {
  GraphQLFieldConfigArgumentMap as _GraphQLFieldConfigArgumentMap,
  GraphQLFieldResolveFn as _GraphQLFieldResolveFn,
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
  InputObjectConfig as _InputObjectConfig,
  InputObjectField as _InputObjectField,
  InputObjectFieldConfig as _InputObjectFieldConfig,
  InputObjectConfigFieldMap as _InputObjectConfigFieldMap,
  //  InputObjectConfigFieldMapThunk as _InputObjectConfigFieldMapThunk,
  GraphQLInterfaceType as _GraphQLInterfaceType,
  GraphQLInputType as _GraphQLInputType,
  GraphQLNullableType as _GraphQLNullableType,
} from 'graphql/type/definition.js';

import type Resolver from './resolver/resolver';
import type ResolverList from './resolver/resolverList';
import type InputTypeComposer from './inputTypeComposer';


export type ObjectMap = { [optName: string]: mixed };
export type ProjectionType = { [fieldName: string]: true | ProjectionType };
export type ProjectionMapType = { [relationfieldName: string]: ProjectionType };

// GRAPHQL RE-EXPORT --------------------
export type GraphQLType = _GraphQLType;
export type GraphQLObjectType = _GraphQLObjectType;
export type GraphQLObjectTypeConfig = _GraphQLObjectTypeConfig;
export type GraphQLNullableType = _GraphQLNullableType;
export type GraphQLInterfaceType = _GraphQLInterfaceType;
export type GraphQLInterfacesThunk = () => Array<GraphQLInterfaceType>;
export type GraphQLOutputType = _GraphQLOutputType;
export type InputObjectField = _InputObjectField;
export type GraphQLInputObjectType = _GraphQLInputObjectType;
export type InputObjectConfig = _InputObjectConfig;
export type GraphQLFieldConfigArgumentMap = _GraphQLFieldConfigArgumentMap;
export type GraphQLFieldResolveFn = _GraphQLFieldResolveFn<*>;
export type GraphQLResolveInfo = _GraphQLResolveInfo;
export type GraphQLArgumentConfig = _GraphQLArgumentConfig;
export type GraphQLNamedType = _GraphQLNamedType;
export type GraphQLFieldConfig = _GraphQLFieldConfig<*>;
export type GraphQLFieldConfigMap = _GraphQLFieldConfigMap<*>;
export type GraphQLFieldConfigMapThunk = () => GraphQLFieldConfigMap;
export type ResolveParams = {
  source: mixed,
  args: {[argName: string]: mixed},
  context: mixed,
  info: GraphQLResolveInfo,
  projection: ProjectionType,
  [opt: string]: mixed,
};
export type InputObjectFieldConfig = _InputObjectFieldConfig;
export type InputObjectConfigFieldMap = _InputObjectConfigFieldMap;
export type InputObjectConfigFieldMapThunk = () => InputObjectConfigFieldMap; // _InputObjectConfigFieldMapThunk;
export type GraphQLInputType = _GraphQLInputType;

export type GraphQLObjectTypeExtended = GraphQLObjectType & {
  _gqcInputTypeComposer?: InputTypeComposer,
  _gqcResolvers?: Map<string, Resolver>,
  _gqcGetRecordIdFn?: GetRecordIdFn,
  _gqcProjectionMapper?: ProjectionMapType,
  _gqcRelations?: RelationThunkMap,
  description: ?string,
};

// RELATION -----------------------------
export type RelationThunkMap = { [fieldName: string]: RelationThunk };
export type RelationThunk = () => RelationOpts;
export type RelationOpts = {
  resolver: Resolver,
  args?: RelationArgsMapper,
  projection?: ProjectionType,
  description?: string,
  deprecationReason?: string,
  catchErrors?: boolean,
}
export type ArgsType = { [argName: string]: mixed };
export type RelationArgsMapperFn = (source: mixed, args: ArgsType, context: ?mixed) => ArgsType;
export type RelationArgsMapper = {
  [argName: string]: RelationArgsMapperFn | null | void | mixed,
};

// RESOLVER -----------------------------
export type ResolverMWMethodKeys = 'args' | 'resolve' | 'outputType';
export type ResolverKinds = 'query' | 'mutation' | 'subscription';

export type ResolverMWArgsFn = (args: GraphQLFieldConfigArgumentMap) => GraphQLFieldConfigArgumentMap;
export type ResolverMWArgs = (next: ResolverMWArgsFn) => ResolverMWArgsFn;

export type ResolverMWResolveFn = (resolveParams: ResolveParams) => Promise<*>;
export type ResolverMWResolve = (next: ResolverMWResolveFn) => ResolverMWResolveFn;

export type ResolverMWOutputTypeFn = (outputType: GraphQLOutputType) => GraphQLOutputType;
export type ResolverMWOutputType = (next: ResolverMWOutputTypeFn) => ResolverMWOutputTypeFn;

export type ResolverFieldConfig = {
  type: GraphQLOutputType,
  args: GraphQLFieldConfigArgumentMap,
  resolve: GraphQLFieldResolveFn,
  name?: ?string,
};

export type GetRecordIdFn = (source: mixed, args: ?mixed, context: ?mixed) => string;

export type ResolverFilterArgFn = (query: mixed, value: mixed, resolveParams: ResolveParams) => any;

export type ResolverFilterArgConfig = {
  name: string,
  type: string | GraphQLInputObjectType,
  description: string,
  query: ResolverFilterArgFn,
  filterTypeNameFallback?: string,
};

export type ResolverSortArgFn = (resolveParams: ResolveParams) => any;

export type ResolverSortArgConfig = {
  name: string,
  sortTypeNameFallback?: string,
  value: ResolverSortArgFn | mixed;
  deprecationReason?: ?string;
  description?: ?string;
};

export type ResolverOpts = {
  outputType?: GraphQLOutputType,
  resolve?: ResolverMWResolveFn,
  args?: GraphQLFieldConfigArgumentMap,
  name?: string,
  kind?: ResolverKinds,
  description?: string,
  parent?: Resolver,
};

export type ResolverWrapFn =
  (newResolver: Resolver, prevResolver: Resolver) => Resolver;
export type ResolverWrapArgsFn =
  (prevArgs: GraphQLFieldConfigArgumentMap) => GraphQLFieldConfigArgumentMap;
export type ResolverWrapOutputTypeFn =
  (prevOutputType: GraphQLOutputType) => GraphQLOutputType;
