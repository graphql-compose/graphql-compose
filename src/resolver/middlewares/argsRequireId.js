/* @flow */

import ResolverMiddleware from '../resolverMiddleware';
import { GraphQLString } from 'graphql';
import type {
  ResolverMWArgsFn,
  ObjectMap,
  ResolverMWResolveFn,
  ResolverMWResolve,
  ResolveParams,
  ResolverMWArgs,
  GraphQLFieldConfigArgumentMap,
} from '../../definition';

export default class ArgsRequireId extends ResolverMiddleware {
  opts: ObjectMap;

  constructor(opts: ObjectMap = {}) {
    super(opts);
    this.opts = opts;
  }

  args: ResolverMWArgs = (next: ResolverMWArgsFn) => (args: GraphQLFieldConfigArgumentMap) => {
    const nextArgs = Object.assign({}, args, {
      id: {
        type: GraphQLString,
        isRequired: true,
      },
    });
    return next(nextArgs);
  };

  resolve: ResolverMWResolve = (next: ResolverMWResolveFn) => (resolveParams: ResolveParams) => {
    return next(resolveParams);
  };
}
