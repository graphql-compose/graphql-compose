jest.disableAutomock();
jest.mock('../gqc');

import GQC from '../gqc';

import {
  GraphQLObjectType,
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
      const fieldNames = Object.keys(composer.getFields());

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

    it('should clear defineFieldMap if fields modified after schema build', () => {
      GQC.typeComposer('RootQuery')
        .addField('testField', {
          type: GraphQLString,
        });

      GQC.buildSchema();

      const definedFieldMap = GQC.typeComposer('RootQuery').getType()._fields;
      expect(typeof definedFieldMap).toEqual('object');

      GQC.typeComposer('RootQuery')
        .addField('testField2', {
          type: GraphQLString,
        });

      expect(GQC.typeComposer('RootQuery').getType()._fields).toEqual(undefined);
    });
  });
});
