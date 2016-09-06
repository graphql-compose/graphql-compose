import {
  GraphQLInt,
  GraphQLString,
} from 'graphql';
import gqc from '../gqc';

gqc.typeComposer('User').addFields({
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
gqc.__mockExistedType = 'User';

export default gqc;
