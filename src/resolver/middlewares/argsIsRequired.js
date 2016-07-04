/* @flow */

/*
This middleware wrap arguments in GraphQLNonNull
if they have param `isRequired: true` in their config
*/

import ResolverMiddleware from '../resolverMiddleware';
import { GraphQLNonNull } from 'graphql';
import type {
  ResolverMWArgsFn,
  ResolverMWArgs,
  ObjectMap,
  GraphQLFieldConfigArgumentMap,
} from '../../definition';
import type TypeComposer from '../../typeComposer';


export default class ArgsIsRequired extends ResolverMiddleware {
  constructor(typeComposer: TypeComposer, opts: ObjectMap = {}) {
    super(typeComposer, opts);
  }

  args: ResolverMWArgs = (next: ResolverMWArgsFn) => (args: GraphQLFieldConfigArgumentMap) => {
    const nextArgs = next(args);

    Object.keys(nextArgs).forEach(argName => {
      const argConfig = nextArgs[argName];
      if (argConfig.hasOwnProperty('isRequired') && argConfig.isRequired) {
        if (!(argConfig.type instanceof GraphQLNonNull)) {
          argConfig.type = new GraphQLNonNull(argConfig.type);
        }
      }
      nextArgs[argName] = argConfig;
    });

    return nextArgs;
  };
}
