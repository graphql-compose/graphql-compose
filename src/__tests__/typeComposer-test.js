import { expect } from 'chai';
import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
} from 'graphql';
import GQC from '../gqc';
import TypeComposer from '../typeComposer';


describe('TypeComposer', () => {
  describe('fields manipulation', () => {
    let objectType;

    beforeEach(() => {
      objectType = new GraphQLObjectType({
        name: 'Readable',
        fields: {
          field1: { type: GraphQLString },
          field2: { type: GraphQLString },
        },
      });
    });


    it('should has `getFields` method', () => {
      const tc = new TypeComposer(objectType);
      const fieldNames = Object.keys(tc.getFields());
      expect(fieldNames).to.have.members(['field1', 'field2']);
    });


    it('should has `addFields` method', () => {
      const tc = new TypeComposer(objectType);
      tc.addField('field3', { type: GraphQLString });
      const fieldNames = Object.keys(objectType.getFields());
      expect(fieldNames).to.include('field3');
    });


    it('should add fields with converting types from string to object', () => {
      const tc = new TypeComposer(objectType);
      tc.addField('field3', { type: 'String' });
      tc.addFields({
        field4: { type: '[Int]' },
        field5: { type: 'Boolean!' },
      });

      expect(tc.getField('field3').type).to.equal(GraphQLString);
      expect(tc.getField('field4').type).instanceof(GraphQLList);
      expect(tc.getField('field4').type.ofType).to.equal(GraphQLInt);
      expect(tc.getField('field5').type).instanceof(GraphQLNonNull);
      expect(tc.getField('field5').type.ofType).to.equal(GraphQLBoolean);
    });


    it('should add fields with converting args types from string to object', () => {
      const tc = new TypeComposer(objectType);
      tc.addField('field3', {
        type: 'String',
        args: {
          arg1: { type: 'String!' },
          arg2: '[Float]',
        },
      });

      expect(tc.getFieldArg('field3', 'arg1').type).instanceof(GraphQLNonNull);
      expect(tc.getFieldArg('field3', 'arg1').type.ofType).to.equal(GraphQLString);
      expect(tc.getFieldArg('field3', 'arg2').type).instanceof(GraphQLList);
      expect(tc.getFieldArg('field3', 'arg2').type.ofType).to.equal(GraphQLFloat);
    });


    it('should add projection via addField and addFields', () => {
      const tc = new TypeComposer(objectType);
      tc.addField('field3', {
        type: GraphQLString,
        projection: { field1: true, field2: true },
      });
      tc.addFields({
        field4: { type: GraphQLString },
        field5: { type: GraphQLString, projection: { field4: true } },
      });

      expect(tc.getProjectionMapper()).to.deep.equal({
        field3: { field1: true, field2: true },
        field5: { field4: true },
      });
    });


    it('should clone projection for fields', () => {
      const tc = new TypeComposer(objectType);
      tc.addField('field3', {
        type: GraphQLString,
        projection: { field1: true, field2: true },
      });

      const tc2 = tc.clone('newObject');
      expect(tc2.getProjectionMapper()).to.deep.equal({
        field3: { field1: true, field2: true },
      });
    });
  });

  describe('static method create()', () => {
    it('should create TC by typeName as a string', () => {
      const TC = TypeComposer.create('TypeStub');
      expect(TC).instanceof(TypeComposer);
      expect(TC.getType()).instanceof(GraphQLObjectType);
      expect(TC.getFields()).deep.equal({});
    });

    it('should create TC by type template string', () => {
      const TC = TypeComposer.create(`
        type TestTypeTpl {
          f1: String
          # Description for some required Int field
          f2: Int!
        }
      `);
      expect(TC).instanceof(TypeComposer);
      expect(TC.getTypeName()).equal('TestTypeTpl');
      expect(TC.getFieldType('f1')).equal(GraphQLString);
      expect(TC.getFieldType('f2')).instanceof(GraphQLNonNull);
      expect(TC.getFieldType('f2').ofType).equal(GraphQLInt);
    });

    it('should create TC by GraphQLObjectTypeConfig', () => {
      const TC = TypeComposer.create({
        name: 'TestType',
        fields: {
          f1: {
            type: 'String',
          },
          f2: 'Int!',
        },
      });
      expect(TC).instanceof(TypeComposer);
      expect(TC.getFieldType('f1')).equal(GraphQLString);
      expect(TC.getFieldType('f2')).instanceof(GraphQLNonNull);
      expect(TC.getFieldType('f2').ofType).equal(GraphQLInt);
    });

    it('should create TC by GraphQLObjectType', () => {
      const objType = new GraphQLObjectType({
        name: 'TestTypeObj',
        fields: {
          f1: {
            type: GraphQLString,
          },
        },
      });
      const TC = TypeComposer.create(objType);
      expect(TC).instanceof(TypeComposer);
      expect(TC.getType()).equal(objType);
      expect(TC.getFieldType('f1')).equal(GraphQLString);
    });
  });

  it('should return type by path', () => {
    const tc = new TypeComposer(new GraphQLObjectType({
      name: 'Readable',
      fields: {
        field1: {
          type: GraphQLString,
          args: {
            arg1: {
              type: GraphQLInt,
            },
          },
        },
      },
    }));

    expect(tc.get('field1')).equal(GraphQLString);
    expect(tc.get('field1.@arg1')).equal(GraphQLInt);
  });
});
