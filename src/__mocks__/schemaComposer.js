/* @flow strict */

import { GraphQLInt, GraphQLString } from '../graphql';
import { schemaComposer } from '..';

schemaComposer.getOrCreateTC('User').addFields({
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

export default schemaComposer;
