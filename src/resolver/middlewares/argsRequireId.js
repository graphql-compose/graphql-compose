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
import type TypeComposer from '../../typeComposer';

export default class ArgsRequireId extends ResolverMiddleware {
  constructor(typeComposer: TypeComposer, opts: ObjectMap = {}) {
    super(typeComposer, opts);
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
