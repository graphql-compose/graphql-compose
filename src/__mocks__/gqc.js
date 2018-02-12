/* @flow strict */

import { GraphQLInt, GraphQLString } from '../graphql';
import { GQC } from '../';

GQC.getOrCreateTC('User').addFields({
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

export default GQC;
