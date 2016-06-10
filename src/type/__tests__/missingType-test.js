jest.disableAutomock();

import {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
} from 'graphql';

import MissingType from '../missingType';

jest.mock('../../gqc');
import gqc from '../../gqc';


describe('MissingType', () => {
  it('should coerse value to string', () => {
    const unknownType = 'BlackCow';
    expect(MissingType.serialize(unknownType)).toEqual(unknownType);
  });

  it('should pass value through resolve method', async () => {
    const unknownType = 'BlackCow';

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          foo: {
            type: MissingType,
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

      const fieldType = gqc.typeComposer('RootQuery')
        .addRelation('foo', gqc.getTypeResolver(unknownType))
        .getFieldType('foo');

      expect(fieldType).toEqual(MissingType);
    }
  );

  it('should pass a type name in response',
    async () => {
      const unknownTypeName = 'BlackCow';

      const rootQuery = gqc.typeComposer('RootQuery')
        .addRelation('foo', gqc.getTypeResolver(unknownTypeName))
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
