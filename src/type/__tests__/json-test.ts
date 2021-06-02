// copied from https://github.com/taion/graphql-type-json

import { graphql, GraphQLObjectType, GraphQLSchema } from '../../graphql';
import { GraphQLJSON } from '..';
import { dedent, schemaComposer, graphqlVersion } from '../../';

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

beforeEach(() => {
  schemaComposer.clear();
});

describe('GraphQLJSON', () => {
  let schema: GraphQLSchema;

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
            resolve: (_, { arg }) => arg,
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
    it('should support parsing values', (done) => {
      graphql({
        schema,
        source: 'query ($arg: JSON) { value(arg: $arg) }',
        variableValues: {
          arg: FIXTURE,
        },
      }).then(({ data }: any) => {
        expect(data.value).toEqual(FIXTURE);
        done();
      });
    });
  });

  describe('parseLiteral', () => {
    it('should support parsing literals', async () => {
      const { data } = await graphql({
        schema,
        source: `
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
        `,
      });

      expect(data?.value).toEqual({
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
    });

    it('should reject invalid literals', async () => {
      const { data } = await graphql({
        schema,
        source: `
        {
          value(arg: NaN){
            string: "string"
        }
      `,
      });
      expect(data).toBeUndefined();
    });
  });

  it('check SDL', () => {
    if (graphqlVersion >= 15 && graphqlVersion < 16) {
      schemaComposer.add(GraphQLJSON);
      expect(schemaComposer.getSTC('JSON').toSDL()).toBe(dedent`
        """
        The \`JSON\` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf).
        """
        scalar JSON @specifiedBy(url: "http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf")
      `);
    }
  });
});
