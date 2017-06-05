import { GraphQLInt, GraphQLString } from 'graphql';
import gqc from '../gqc';

gqc.get('User').addFields({
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
