/* @flow */

/*
This middleware wrap arguments in GraphQLNonNull
if they have param `isRequired: true` in their config
*/

import ResolverMiddleware from '../resolverMiddleware';
import { GraphQLNonNull } from 'graphql/type';
import type {
  NextArgsFn,
  ObjectMap,
  ResolverMiddlewareArgs,
  GraphQLFieldConfigArgumentMap,
} from '../../definition';


export default class ArgsIsRequired extends ResolverMiddleware {
  opts: ObjectMap;

  constructor(opts: ObjectMap = {}) {
    super(opts);
    this.opts = opts;
  }

  args: ResolverMiddlewareArgs = (next: NextArgsFn) => (args: GraphQLFieldConfigArgumentMap) => {
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
