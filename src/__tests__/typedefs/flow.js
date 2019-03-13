/* @flow */

import { schemaComposer } from '../..';

// Should not be Flow errors
export const resolver = schemaComposer.createResolver({
  name: 'findMany',
  kind: 'query',
  type: 'String',
  args: {
    filter: 'JSON',
    limit: 'Int',
    skip: 'Int',
  },
  resolve: () => Promise.resolve(123),
});
