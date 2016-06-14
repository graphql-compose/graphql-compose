/* @flow */

import type {
  GraphQLFieldConfigArgumentMap,
  GraphQLFieldResolveFn,
  GraphQLResolveInfo,
} from 'graphql/type/definition.js';

export type ObjectMap = { [optName: string]: mixed };
export type NextArgsFn = (args: GraphQLFieldConfigArgumentMap) => GraphQLFieldConfigArgumentMap;
export type ArgsMap = GraphQLFieldConfigArgumentMap;

export type ResolveParams = {
  source: mixed,
  args: {[argName: string]: mixed},
  context: mixed,
  info: GraphQLResolveInfo
};
export type NextResolveFn = (resolveParams: ResolveParams) => mixed;
export type ResolveFn = GraphQLFieldResolveFn;
