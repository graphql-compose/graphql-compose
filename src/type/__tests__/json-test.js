/* @flow */

// copied from https://github.com/taion/graphql-type-json

import { expect } from 'chai';
import { graphql, GraphQLObjectType, GraphQLSchema } from 'graphql';

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
      expect(GraphQLJSON.serialize(FIXTURE)).to.eql(FIXTURE);
    });
  });

  describe('parseValue', () => {
    it('should support parsing values', done => {
      graphql(schema, 'query ($arg: JSON) { value(arg: $arg) }', null, null, {
        arg: FIXTURE,
      }).then(({ data }) => {
        expect(data.value).to.eql(FIXTURE);
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
          value(arg: {
            string: "string",
            int: 3,
            float: 3.14,
            true: true,
            false: false,
            null: null,
            object: {
              string: "string",
              int: 3,
              float: 3.14,
              true: true,
              false: false,
              null: null,
            },
            array: [
              "string",
              3,
              3.14,
              true,
              false,
              null,
            ],
          }),
        }
      `
      ).then(({ data }) => {
        expect(data.value).to.eql({
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
