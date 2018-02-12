/* @flow strict */

// copied from https://github.com/taion/graphql-type-json

import { graphql, GraphQLObjectType, GraphQLSchema } from '../../graphql';

import GraphQLJSON from '../json';

const FIXTURE = {
  string: 'string',
  int: 3,
  float: Math.PI,
  true: true,
  false: true,
  null: null,
  object: {
    string: 'string',
    int: 3,
    float: Math.PI,
    true: true,
    false: true,
    null: null,
  },
  array: ['string', 3, Math.PI, true, false, null],
};

describe('GraphQLJSON', () => {
  let schema;

  beforeEach(() => {
    schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          value: {
            type: GraphQLJSON,
            args: {
              arg: {
                type: GraphQLJSON,
              },
            },
            resolve: (obj, { arg }) => arg,
          },
        },
      }),
    });
  });

  describe('serialize', () => {
    it('should support serialization', () => {
      expect(GraphQLJSON.serialize(FIXTURE)).toEqual(FIXTURE);
    });
  });

  describe('parseValue', () => {
    it('should support parsing values', done => {
      graphql(schema, 'query ($arg: JSON) { value(arg: $arg) }', null, null, {
        arg: FIXTURE,
      }).then(({ data }: any) => {
        expect(data.value).toEqual(FIXTURE);
        done();
      });
    });
  });

  describe('parseLiteral', () => {
    it('should support parsing literals', done => {
      graphql(
        schema,
        `
          {
            value(
              arg: {
                string: "string"
                int: 3
                float: 3.14
                true: true
                false: false
                null: null
                object: {
                  string: "string"
                  int: 3
                  float: 3.14
                  true: true
                  false: false
                  null: null
                }
                array: ["string", 3, 3.14, true, false, null]
              }
            )
          }
        `
      ).then(({ data }: any) => {
        expect(data.value).toEqual({
          string: 'string',
          int: 3,
          float: 3.14,
          true: true,
          false: false,
          null: null,
          object: {
            string: 'string',
            int: 3,
            float: 3.14,
            true: true,
            false: false,
            null: null,
          },
          array: ['string', 3, 3.14, true, false, null],
        });
        done();
      });
    });
  });
});
