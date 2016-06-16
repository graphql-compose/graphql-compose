/* @flow */
/* eslint-disable */

import type {
  GraphQLFieldConfigArgumentMap as _GraphQLFieldConfigArgumentMap,
  GraphQLFieldResolveFn as _GraphQLFieldResolveFn,
  GraphQLResolveInfo as _GraphQLResolveInfo,
  GraphQLArgumentConfig as _GraphQLArgumentConfig,
  GraphQLOutputType as _GraphQLOutputType,
} from 'graphql/type/definition.js';

export type ObjectMap = { [optName: string]: mixed };

// GRAPHQL RE-EXPORT --------------------
export type GraphQLOutputType = _GraphQLOutputType;
export type GraphQLFieldConfigArgumentMap = _GraphQLFieldConfigArgumentMap;
export type GraphQLFieldResolveFn = _GraphQLFieldResolveFn;
export type GraphQLResolveInfo = _GraphQLResolveInfo;
export type GraphQLArgumentConfig = _GraphQLArgumentConfig;
export type ResolveParams = {
  source: mixed,
  args: {[argName: string]: mixed},
  context: mixed,
  info: GraphQLResolveInfo
};

// RESOLVER -----------------------------
export type ResolverMiddlewareMethodKeys = 'args' | 'resolve';

export type NextArgsFn = (args: GraphQLFieldConfigArgumentMap) => GraphQLFieldConfigArgumentMap;
export type ResolverMiddlewareArgs = (next: NextArgsFn) => NextArgsFn;

export type NextResolveFn = (resolveParams: ResolveParams) => mixed;
export type ResolverMiddlewareResolve = (next: NextResolveFn) => NextResolveFn;

export type ResolverFieldConfig = {
  type: GraphQLOutputType,
  args: GraphQLFieldConfigArgumentMap,
  resolve: GraphQLFieldResolveFn
};
