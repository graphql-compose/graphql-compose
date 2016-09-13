import { expect } from 'chai';
import {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
} from 'graphql';
import MissingTypeResolver from '../missingTypeResolver';
import gqc from '../../gqc';


describe('MissingTypeResolver', () => {
  it('should coerse value to string', () => {
    const unknownType = 'BlackCow';
    expect(MissingTypeResolver.serialize(unknownType)).to.equal(unknownType);
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
    ).to.deep.equal({
      data: {
        foo: unknownType,
      },
    });
  });
});
