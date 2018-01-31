/* @flow */

import { GraphQLInt, GraphQLString } from '../graphql';
import gqc from '../gqc';

gqc.getOrCreateTC('User').addFields({
  name: {
    type: GraphQLString,
  },
  nickname: {
    type: GraphQLString,
  },
  age: {
    type: GraphQLInt,
  },
});

export default gqc;
