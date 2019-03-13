/* @flow strict */

import { GraphQLInt, GraphQLString } from '../graphql';
import { schemaComposer } from '..';

schemaComposer.getOrCreateTC('User', tc =>
  tc.addFields({
    name: {
      type: GraphQLString,
    },
    nickname: {
      type: GraphQLString,
    },
    age: {
      type: GraphQLInt,
    },
  })
);

export default schemaComposer;
