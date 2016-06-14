/* @flow */
import {
  GraphQLNonNull,
  type GraphQLType, 
} from 'graphql/type';

/*
This middleware wrap arguments in GraphQLNonNull
if they have param `isRequired: true` in their config
*/

type ObjectMap = { [optName: string]: mixed };
type ResolverArgs = { [optName: string]: ObjectMap };

export default class ArgsIsRequired {
  opts: ObjectMap;

  constructor(opts: ObjectMap = {}) {
    this.opts = opts;
  }

  args: ObjectMap = next => (args: ResolverArgs) => {
    const nextArgs: ResolverArgs = next(args);

    Object.keys(nextArgs).forEach(argName => {
      const argConfig = nextArgs[argName];
      if (argConfig.hasOwnProperty('isRequired') && argConfig.isRequired) {
        if (!(argConfig.type instanceof GraphQLNonNull)) {
          argConfig.type = new GraphQLNonNull(argConfig.type); // eslint-disable-line
        }
      }
      nextArgs[argName] = argConfig;
    });
    return nextArgs;
  };
}
