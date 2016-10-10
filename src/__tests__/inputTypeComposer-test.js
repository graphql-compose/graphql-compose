import { expect } from 'chai';
import {
  GraphQLInputObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLBoolean,
} from 'graphql';
import InputTypeComposer from '../inputTypeComposer';


describe('InputTypeComposer', () => {
  let objectType;

  beforeEach(() => {
    objectType = new GraphQLInputObjectType({
      name: 'InputType',
      fields: {
        input1: { type: GraphQLString },
        input2: { type: GraphQLString },
      },
    });
  });


  it('should has `getFields` method', () => {
    const tc = new InputTypeComposer(objectType);
    const fieldNames = Object.keys(tc.getFields());
    expect(fieldNames).to.have.members(['input1', 'input2']);
  });


  it('should has `addFields` method', () => {
    const tc = new InputTypeComposer(objectType);
    tc.addField('input3', { type: GraphQLString });
    const fieldNames = Object.keys(objectType.getFields());
    expect(fieldNames).to.include('input3');
  });


  it('should add fields with converting types from string to object', () => {
    const tc = new InputTypeComposer(objectType);
    tc.addField('input3', { type: 'String' });
    tc.addFields({
      input4: { type: '[Int]' },
      input5: { type: 'Boolean!' },
    });

    expect(tc.getField('input3').type).to.equal(GraphQLString);
    expect(tc.getField('input4').type).instanceof(GraphQLList);
    expect(tc.getField('input4').type.ofType).to.equal(GraphQLInt);
    expect(tc.getField('input5').type).instanceof(GraphQLNonNull);
    expect(tc.getField('input5').type.ofType).to.equal(GraphQLBoolean);
  });

  describe('static method create()', () => {
    it('should create ITC by typeName as a string', () => {
      const TC = InputTypeComposer.create('TypeStub');
      expect(TC).instanceof(InputTypeComposer);
      expect(TC.getType()).instanceof(GraphQLInputObjectType);
      expect(TC.getFields()).deep.equal({});
    });

    it('should create ITC by type template string', () => {
      const TC = InputTypeComposer.create(`
        input TestTypeTplInput {
          f1: String
          # Description for some required Int field
          f2: Int!
        }
      `);
      expect(TC).instanceof(InputTypeComposer);
      expect(TC.getTypeName()).equal('TestTypeTplInput');
      expect(TC.getFieldType('f1')).equal(GraphQLString);
      expect(TC.getFieldType('f2')).instanceof(GraphQLNonNull);
      expect(TC.getFieldType('f2').ofType).equal(GraphQLInt);
    });

    it('should create ITC by GraphQLObjectTypeConfig', () => {
      const TC = InputTypeComposer.create({
        name: 'TestTypeInput',
        fields: {
          f1: {
            type: 'String',
          },
          f2: 'Int!',
        },
      });
      expect(TC).instanceof(InputTypeComposer);
      expect(TC.getFieldType('f1')).equal(GraphQLString);
      expect(TC.getFieldType('f2')).instanceof(GraphQLNonNull);
      expect(TC.getFieldType('f2').ofType).equal(GraphQLInt);
    });

    it('should create ITC by GraphQLInputObjectType', () => {
      const objType = new GraphQLInputObjectType({
        name: 'TestTypeObj',
        fields: {
          f1: {
            type: GraphQLString,
          },
        },
      });
      const TC = InputTypeComposer.create(objType);
      expect(TC).instanceof(InputTypeComposer);
      expect(TC.getType()).equal(objType);
      expect(TC.getFieldType('f1')).equal(GraphQLString);
    });
  });
});
