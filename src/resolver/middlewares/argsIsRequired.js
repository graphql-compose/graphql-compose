/* @flow */

/*
This middleware wrap arguments in GraphQLNonNull
if they have param `isRequired: true` in their config
*/


import { GraphQLNonNull } from 'graphql/type';
import type {
  NextArgsFn,
  ArgsMap,
  ObjectMap,
} from './flowTypes';


export default class ArgsIsRequired {
  opts: ObjectMap;

  constructor(opts: ObjectMap = {}) {
    this.opts = opts;
  }

  args: ArgsMap = (next: NextArgsFn) => (args: ArgsMap) => {
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
