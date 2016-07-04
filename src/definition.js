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
  GraphQLInputObjectType as _GraphQLInputObjectType,
  GraphQLFieldConfig as _GraphQLFieldConfig,
  GraphQLFieldConfigMap as _GraphQLFieldConfigMap,
  GraphQLType as _GraphQLType,
  InputObjectFieldConfig as _InputObjectFieldConfig,
  InputObjectConfigFieldMap as _InputObjectConfigFieldMap,
//  InputObjectConfigFieldMapThunk as _InputObjectConfigFieldMapThunk,
  GraphQLInputType as _GraphQLInputType,
} from 'graphql/type/definition.js';

export type ObjectMap = { [optName: string]: mixed };

// GRAPHQL RE-EXPORT --------------------
export type GraphQLType = _GraphQLType;
export type GraphQLObjectType = _GraphQLObjectType;
export type GraphQLOutputType = _GraphQLOutputType;
export type GraphQLInputObjectType = _GraphQLInputObjectType;
export type GraphQLFieldConfigArgumentMap = _GraphQLFieldConfigArgumentMap;
export type GraphQLFieldResolveFn = _GraphQLFieldResolveFn;
export type GraphQLResolveInfo = _GraphQLResolveInfo;
export type GraphQLArgumentConfig = _GraphQLArgumentConfig;
export type GraphQLNamedType = _GraphQLNamedType;
export type GraphQLFieldConfig = _GraphQLFieldConfig;
export type GraphQLFieldConfigMap = _GraphQLFieldConfigMap;
export type GraphQLFieldConfigMapThunk = () => GraphQLFieldConfigMap;
export type ResolveParams = {
  source: mixed,
  args: {[argName: string]: mixed},
  context: mixed,
  info: GraphQLResolveInfo,
  projection: { [fieldName: string]: true },
  [opt: string]: mixed,
};
export type InputObjectFieldConfig = _InputObjectFieldConfig;
export type InputObjectConfigFieldMap = _InputObjectConfigFieldMap;
export type InputObjectConfigFieldMapThunk = () => InputObjectConfigFieldMap; // _InputObjectConfigFieldMapThunk;
export type GraphQLInputType = _GraphQLInputType;

// RESOLVER -----------------------------
export type ResolverMWMethodKeys = 'args' | 'resolve' | 'outputType';
export type ResolverKinds = 'query' | 'mutation' | 'subscription';

export type ResolverMWArgsFn = (args: GraphQLFieldConfigArgumentMap) => GraphQLFieldConfigArgumentMap;
export type ResolverMWArgs = (next: ResolverMWArgsFn) => ResolverMWArgsFn;

export type ResolverMWResolveFn = (resolveParams: ResolveParams) => Promise;
export type ResolverMWResolve = (next: ResolverMWResolveFn) => ResolverMWResolveFn;

export type ResolverMWOutputTypeFn = (outputType: GraphQLOutputType) => GraphQLOutputType;
export type ResolverMWOutputType = (next: ResolverMWOutputTypeFn) => ResolverMWOutputTypeFn;

export type ResolverFieldConfig = {
  type: GraphQLOutputType,
  args: GraphQLFieldConfigArgumentMap,
  resolve: GraphQLFieldResolveFn,
  name?: ?string,
};

export type GetRecordIdFn = (source: string) => string;
