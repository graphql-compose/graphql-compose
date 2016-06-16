/* @flow */

import ResolverMiddleware from '../resolverMiddleware';
import { GraphQLString } from 'graphql';
import type {
  NextArgsFn,
  ObjectMap,
  NextResolveFn,
  ResolveParams,
  ResolverMiddlewareArgs,
  GraphQLFieldConfigArgumentMap,
  ResolverMiddlewareResolve,
} from '../../definition';

export default class ArgsRequireId extends ResolverMiddleware {
  opts: ObjectMap;

  constructor(opts: ObjectMap = {}) {
    super(opts);
    this.opts = opts;
  }

  args: ResolverMiddlewareArgs = (next: NextArgsFn) => (args: GraphQLFieldConfigArgumentMap) => {
    const nextArgs = Object.assign({}, args, {
      id: {
        type: GraphQLString,
        isRequired: true,
      },
    });
    return next(nextArgs);
  };

  resolve: ResolverMiddlewareResolve = (next: NextResolveFn) => (resolveParams: ResolveParams) => {
    return next(resolveParams);
  };
}
