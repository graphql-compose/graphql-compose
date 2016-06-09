jest.disableAutomock();

import {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
} from 'graphql';

import MissingTypeResolver from '../missingTypeResolver';
import ComposeStorage from '../../ComposeStorage';
import ComposeType from '../../ComposeType';


describe('MissingTypeResolver', () => {
  it('should coerse value to string', () => {
    const unknownType = 'BlackCow';
    expect(MissingTypeResolver.serialize(unknownType)).toEqual(unknownType);
  });

  it('should pass value through resolve method', async () => {
    const unknownType = 'BlackCow';

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          foo: {
            type: MissingTypeResolver,
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

  it('should be set as type for field, which composed via undefined resolver in existed type',
    async () => {
      const existedTypeName = 'User';
      const unknownResolverName = 'missingResolverName';

      const existedTypeComposer = new ComposeType(existedTypeName);

      console.log(ComposeStorage);

      const fieldType = new ComposeType('RootQuery')
        .addRelation('foo', ComposeStorage.getTypeResolver(existedTypeName, unknownResolverName))
        .getFieldType('foo');

      expect(fieldType).toEqual(MissingTypeResolver);
    }
  );


  it('should pass a type name and a missing resolver name in response',
    async () => {
      const existedTypeName = 'User';
      const unknownResolverName = 'missingResolverName';

      const existedTypeComposer = new ComposeType(existedTypeName);
      
      const rootQuery = new ComposeType('RootQuery')
        .addRelation('foo', ComposeStorage.getTypeResolver(existedTypeName, unknownResolverName))
        .getType();

      const schema = new GraphQLSchema({
        query: rootQuery,
      });

      expect(
        await graphql(schema, '{ foo }')
      ).toEqual({
        data: {
          foo: `Missing resolver name '${unknownResolverName}' in type '${existedTypeName}'`,
        },
      });
    }
  );
});
