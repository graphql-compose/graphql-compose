/* @flow */

import { GraphQLString } from 'graphql';
import type {
  NextArgsFn,
  ArgsMap,
  ObjectMap,
  NextResolveFn,
  ResolveParams,
} from './flowTypes';

export default class ArgsRequireId {
  opts: ObjectMap;

  constructor(opts: ObjectMap = {}) {
    this.opts = opts;
  }

  args: ObjectMap = (next: NextArgsFn) => (args: ArgsMap) => {
    const nextArgs = Object.assign({}, args, {
      id: {
        type: GraphQLString,
        isRequired: true,
      },
    });
    return next(nextArgs);
  };

  resolve: mixed = (next: NextResolveFn) => (resolveParams: ResolveParams) => {
    return next(resolveParams);
  };
}
