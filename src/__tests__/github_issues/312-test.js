/* @flow */

import { find, filter } from 'lodash'; // eslint-disable-line
import { SchemaComposer } from '../..';

describe('github issue #312: Error when merging graphql-js fields', () => {
  it('test graphql query', async () => {
    const composer = new SchemaComposer();
    composer.Query.addFields({
      test: {
        type: 'String!',
        resolve: () => 'test field value!',
      },
      test3: {
        type: 'Int',
        args: { a: `input Filter { min: Int }` },
      },
    });

    const schema = composer.buildSchema();

    const composer2 = new SchemaComposer();
    const fields = (schema.getQueryType()?.getFields(): any);
    composer2.Query.addFields(fields);

    expect(() => {
      composer2.buildSchema();
    }).not.toThrowError('Query.test should provide "deprecationReason" instead of "isDeprecated".');
  });
});
