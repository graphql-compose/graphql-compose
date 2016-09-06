/* @flow */

import { GraphQLScalarType } from 'graphql';


export default new GraphQLScalarType({
  name: 'MissingType',
  description: 'This field has missing type, which was not found in ComposeStorage. '
  + 'Request this field in query to obtain a type name.',
  serialize: String,
});
