import { GraphQLString } from 'graphql';

export default class ArgsRequireId {
  constructor(opts = {}) {
    this.opts = opts;
  }

  args = next => args => {
    const nextArgs = Object.assign({}, args, {
      id: {
        type: GraphQLString,
        isRequired: true,
      },
    });
    return next(nextArgs);
  };

  resolve = next => resolveArgs => {
    return next(resolveArgs);
  };
}
