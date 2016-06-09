jest.disableAutomock();

import {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
} from 'graphql';

import GraphQLMissingType from '../missingType';
import ComposeStorage from '../../ComposeStorage';
import ComposeType from '../../ComposeType';


describe('MissingType', () => {
  it('should coerse value to string', () => {
    const unknownType = 'BlackCow';
    expect(GraphQLMissingType.serialize(unknownType)).toEqual(unknownType);
  });

  it('should pass value through resolve method', async () => {
    const unknownType = 'BlackCow';

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          foo: {
            type: GraphQLMissingType,
            resolve: () => unknownType,
          },
        },
      }),
    });

    expect(
      await graphql(schema, '{ foo }')
    ).toEqual({
      data: {
        foo: unknownType,
      },
    });
  });

  it('should be set as a type for field, which composed via undefined type resolver',
    async () => {
      const unknownType = 'BlackCow';

      const fieldType = new ComposeType('RootQuery')
        .addRelation('foo', ComposeStorage.getTypeResolver(unknownType))
        .getFieldType('foo');

      expect(fieldType).toEqual(GraphQLMissingType);
    }
  );


  it('should pass a type name in response',
    async () => {
      const unknownTypeName = 'BlackCow';

      const rootQuery = new ComposeType('RootQuery')
        .addRelation('foo', ComposeStorage.getTypeResolver(unknownTypeName))
        .getType();

      const schema = new GraphQLSchema({
        query: rootQuery,
      });

      expect(
        await graphql(schema, '{ foo }')
      ).toEqual({
        data: {
          foo: `Missing type name '${unknownTypeName}'`,
        },
      });
    }
  );
});
