/* @flow */

import { buildSchema, GraphQLSchema } from 'graphql';
import { SchemaComposer, dedent } from '../..';

describe('github issue #287: Can we merge schemas with overriding types in fields', () => {
  it('merge two schemas', () => {
    const schemaA = buildSchema(`
      type Query {
        field1: Int
        """KEEP ME"""
        field2: Int
      }
    `);
    const schemaB = buildSchema(`
      type Query {
        """BBB"""
        field1: String
        field3: String
        field22: Int
      }
    `);
    const sc = new SchemaComposer(schemaA);
    sc.merge(schemaB);

    expect(sc.toSDL({ omitScalars: true, omitDirectiveDefinitions: true })).toEqual(dedent`
      type Mutation

      type Query {
        """BBB"""
        field1: String
      
        """KEEP ME"""
        field2: Int
        field3: String
        field22: Int
      }

      type Subscription
    `);

    expect(sc.buildSchema()).toBeInstanceOf(GraphQLSchema);
  });
});
