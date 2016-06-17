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
  GraphQLFieldConfig as _GraphQLFieldConfig,
  GraphQLFieldConfigMap as _GraphQLFieldConfigMap,
} from 'graphql/type/definition.js';

export type ObjectMap = { [optName: string]: mixed };

// GRAPHQL RE-EXPORT --------------------
export type GraphQLOutputType = _GraphQLOutputType;
export type GraphQLFieldConfigArgumentMap = _GraphQLFieldConfigArgumentMap;
export type GraphQLFieldResolveFn = _GraphQLFieldResolveFn;
export type GraphQLResolveInfo = _GraphQLResolveInfo;
export type GraphQLArgumentConfig = _GraphQLArgumentConfig;
export type GraphQLNamedType = _GraphQLNamedType;
export type GraphQLFieldConfig = _GraphQLFieldConfig;
export type GraphQLFieldConfigMap = _GraphQLFieldConfigMap;
export type GraphQLFieldConfigMapThunk = () => GraphQLFieldConfigMap;
export type GraphQLObjectType = _GraphQLObjectType;
export type ResolveParams = {
  source: mixed,
  args: {[argName: string]: mixed},
  context: mixed,
  info: GraphQLResolveInfo
};

// RESOLVER -----------------------------
export type ResolverMWMethodKeys = 'args' | 'resolve';

export type ResolverMWArgsFn = (args: GraphQLFieldConfigArgumentMap) => GraphQLFieldConfigArgumentMap;
export type ResolverMWArgs = (next: ResolverMWArgsFn) => ResolverMWArgsFn;

export type ResolverMWResolveFn = (resolveParams: ResolveParams) => mixed;
export type ResolverMWResolve = (next: ResolverMWResolveFn) => ResolverMWResolveFn;

export type ResolverFieldConfig = {
  type: GraphQLOutputType,
  args: GraphQLFieldConfigArgumentMap,
  resolve: GraphQLFieldResolveFn
};
