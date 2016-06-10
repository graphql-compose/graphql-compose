jest.disableAutomock();

import {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLList,
  GraphQLScalarType,
  GraphQLString,
} from 'graphql';

import TypeComposer from '../typeComposer';


describe('TypeComposer', () => {
  describe('should be compatible with graphql type instance', () => {
    it('can read fields', () => {
      const objectType = new GraphQLObjectType({
        name: 'Readable',
        fields: {
          field1: { type: GraphQLString },
          field2: { type: GraphQLString },
        },
      });

      const composer = new TypeComposer(objectType);
      const fieldNames = Object.keys(composer._getFields());

      expect(fieldNames).toContain('field1');
      expect(fieldNames).toContain('field2');
      expect(fieldNames).not.toContain('field3');
    });

    it('can write fields', () => {
      const objectType = new GraphQLObjectType({
        name: 'Writeable',
        fields: {
          field1: { type: GraphQLString },
          field2: { type: GraphQLString },
        },
      });

      const composer = new TypeComposer(objectType);
      composer.addField('field3', { type: GraphQLString });
      const fieldNames = Object.keys(objectType.getFields());

      expect(fieldNames).toContain('field3');
    });
  });
  
  
});
