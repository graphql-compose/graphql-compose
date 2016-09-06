/* @flow */

import { GraphQLScalarType } from 'graphql';


export default new GraphQLScalarType({
  name: 'MissingTypeResolver',
  description: 'This field has missing type resolver, which was not found in ComposeStorage. '
  + 'Request this field in query to obtain a type name and a resolver name.',
  serialize: String,
});
