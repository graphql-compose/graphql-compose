jest.disableAutomock();

import {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
} from 'graphql';

import MissingTypeResolver from '../missingTypeResolver';

jest.mock('../../gqc');
import gqc from '../../gqc';


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
      const existedTypeName = gqc.__mockExistedType;
      const unknownResolverName = 'missingResolverName';

      const fieldType = gqc.typeComposer('RootQuery')
        .addRelation('foo', gqc.queries(existedTypeName).get(unknownResolverName))
        .getFieldType('foo');

      expect(fieldType).toEqual(MissingTypeResolver);
    }
  );


  it('should pass a type name and a missing resolver name in response',
    async () => {
      const existedTypeName = gqc.__mockExistedType;
      const unknownResolverName = 'missingResolverName';

      const rootQuery = gqc.typeComposer('RootQuery')
        .addRelation('foo', gqc.queries(existedTypeName).get(unknownResolverName))
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
