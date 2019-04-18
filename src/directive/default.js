/* @flow */

import { GraphQLDirective, DirectiveLocation, GraphQLNonNull } from '../graphql';
import { GraphQLJSON } from '../type';

export default new GraphQLDirective({
  name: 'default',
  description: 'Provides default value for input field.',
  locations: [DirectiveLocation.INPUT_FIELD_DEFINITION],
  args: {
    value: {
      type: new GraphQLNonNull(GraphQLJSON),
    },
  },
});
