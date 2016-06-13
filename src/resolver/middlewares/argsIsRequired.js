import { GraphQLNonNull } from 'graphql';

/*
This middleware wrap arguments in GraphQLNonNull
if they have param `isRequired: true` in their config
*/

export default class ArgsIsRequired {
  constructor(opts = {}) {
    this.opts = opts;
  }

  args = next => args => {
    const nextArgs = {};
    Object.keys(args).forEach(argName => {
      const argConfig = args[argName];
      if (argConfig.hasOwnProperty('isRequired') && argConfig.isRequired) {
        if (!(argConfig.type instanceof GraphQLNonNull)) {
          argConfig.type = new GraphQLNonNull(argConfig.type); // eslint-disable-line
        }
      }
      nextArgs[argName] = argConfig;
    });
    return next(nextArgs);
  };
}
