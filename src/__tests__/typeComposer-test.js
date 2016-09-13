import { expect } from 'chai';
import {
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import GQC from '../gqc';
import TypeComposer from '../typeComposer';


describe('TypeComposer', () => {
  describe('should has `getFields` method', () => {
    it('can read fields', () => {
      const objectType = new GraphQLObjectType({
        name: 'Readable',
        fields: {
          field1: { type: GraphQLString },
          field2: { type: GraphQLString },
        },
      });

      const composer = new TypeComposer(objectType);
      const fieldNames = Object.keys(composer.getFields());
      expect(fieldNames).to.have.members(['field1', 'field2']);
    });


    it('should has `addFields` method', () => {
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
      expect(fieldNames).to.include('field3');
    });
  });
});
