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
      description: 'Mock type',
      fields: {
        input1: { type: GraphQLString },
        input2: { type: GraphQLString },
      },
    });
  });

  describe('field manipulation methods', () => {
    it('getFields()', () => {
      const tc = new InputTypeComposer(objectType);
      const fieldNames = Object.keys(tc.getFields());
      expect(fieldNames).to.have.members(['input1', 'input2']);
    });

    it('getFieldNames()', () => {
      const tc = new InputTypeComposer(objectType);
      expect(tc.getFieldNames()).to.have.members(['input1', 'input2']);
    });

    it('hasField()', () => {
      const tc = new InputTypeComposer(objectType);
      expect(tc.hasField('input1')).to.equal(true);
      expect(tc.hasField('missing')).to.equal(false);
    });

    it('setField()', () => {
      const tc = new InputTypeComposer(objectType);
      tc.setField('input3', { type: GraphQLString });
      const fieldNames = Object.keys(objectType.getFields());
      expect(fieldNames).to.include('input3');
    });

    describe('setFields()', () => {
      it('accept regular fields definition', () => {
        const tc = new InputTypeComposer(objectType);
        tc.setFields({
          input3: { type: GraphQLString },
          input4: { type: GraphQLString },
        });
        expect(tc.getFieldNames()).to.not.have.members(['input1', 'input2']);
        expect(tc.getFieldNames()).to.have.members(['input3', 'input4']);
        expect(tc.getFieldType('input3')).to.equal(GraphQLString);
        expect(tc.getFieldType('input4')).to.equal(GraphQLString);
      });

      it('accept shortand fields definition', () => {
        const tc = new InputTypeComposer(objectType);
        tc.setFields({
          input3: GraphQLString,
          input4: 'String',
        });
        expect(tc.getFieldType('input3')).to.equal(GraphQLString);
        expect(tc.getFieldType('input4')).to.equal(GraphQLString);
      });

      it('accept types as function', () => {
        const tc = new InputTypeComposer(objectType);
        const typeAsFn = () => GraphQLString;
        tc.setFields({
          input3: { type: typeAsFn },
        });
        expect(tc.getFieldType('input3')).to.equal(typeAsFn);

        // show provide unwrapped/unhoisted type for graphql
        expect(tc.getType()._typeConfig.fields().input3.type).to.equal(GraphQLString);
      });
    });

    it('addFields()', () => {
      const tc = new InputTypeComposer(objectType);
      tc.addFields({
        input3: { type: GraphQLString },
        input4: { type: GraphQLString },
      });
      expect(tc.getFieldNames()).to.have.members(['input1', 'input2', 'input3', 'input4']);
    });

    it('removeField()', () => {
      const tc = new InputTypeComposer(objectType);
      tc.removeField('input1');
      expect(tc.getFieldNames()).to.not.include('input1');
      expect(tc.getFieldNames()).to.include('input2');
      tc.removeField(['input2', 'input3']);
      expect(tc.getFieldNames()).to.not.include('input2');
    });

    it('should extend field by name', () => {
      const tc = new InputTypeComposer(objectType);
      tc.setField('input3', {
        type: GraphQLString,
      });
      tc.extendField('input3', {
        description: 'this is input #3',
      });
      expect(tc.getField('input3')).property('type').to.be.equal(GraphQLString);
      expect(tc.getField('input3')).property('description').to.equal('this is input #3');
      tc.extendField('input3', {
        type: 'Int',
      });
      expect(tc.getField('input3')).property('type').to.be.equal(GraphQLInt);
    });

    it('getFieldType()', () => {
      const tc = new InputTypeComposer(objectType);
      expect(tc.getFieldType('input1')).to.equal(GraphQLString);
    });

    it('isRequired()', () => {
      const tc = new InputTypeComposer(objectType);
      expect(tc.isRequired('input1')).to.equal(false);
    });

    it('makeRequired()', () => {
      const tc = new InputTypeComposer(objectType);
      tc.makeRequired('input1');
      expect(tc.getField('input1').type).instanceof(GraphQLNonNull);
      expect(tc.getField('input1').type.ofType).to.equal(GraphQLString);
      expect(tc.isRequired('input1')).to.equal(true);
    });

    it('makeOptional()', () => {
      const tc = new InputTypeComposer(objectType);
      tc.makeRequired('input1');
      expect(tc.isRequired('input1')).to.equal(true);
      tc.makeOptional('input1');
      expect(tc.isRequired('input1')).to.equal(false);
    });

    it('should add fields with converting types from string to object', () => {
      const tc = new InputTypeComposer(objectType);
      tc.setField('input3', { type: 'String' });
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
  });

  describe('type manipulation methods', () => {
    it('getType()', () => {
      const tc = new InputTypeComposer(objectType);
      expect(tc.getType()).instanceof(GraphQLInputObjectType);
      expect(tc.getType().name).to.equal('InputType');
    });

    it('getTypeAsRequired()', () => {
      const tc = new InputTypeComposer(objectType);
      expect(tc.getTypeAsRequired()).instanceof(GraphQLNonNull);
      expect(tc.getTypeAsRequired().ofType.name).to.equal('InputType');
    });

    it('getTypeName()', () => {
      const tc = new InputTypeComposer(objectType);
      expect(tc.getTypeName()).to.equal('InputType');
    });

    it('setTypeName()', () => {
      const tc = new InputTypeComposer(objectType);
      tc.setTypeName('OtherInputType');
      expect(tc.getTypeName()).to.equal('OtherInputType');
    });

    it('getDescription()', () => {
      const tc = new InputTypeComposer(objectType);
      expect(tc.getDescription()).to.equal('Mock type');
    });

    it('setDescription()', () => {
      const tc = new InputTypeComposer(objectType);
      tc.setDescription('Changed description');
      expect(tc.getDescription()).to.equal('Changed description');
    });
  });

  describe('static method create()', () => {
    it('should create ITC by typeName as a string', () => {
      const TC = InputTypeComposer.create('TypeStub');
      expect(TC).instanceof(InputTypeComposer);
      expect(TC.getType()).instanceof(GraphQLInputObjectType);
      expect(TC.getFields()).deep.equal({});
    });

    it('should create ITC by type template string', () => {
      const TC = InputTypeComposer.create(
        `
        input TestTypeTplInput {
          f1: String
          # Description for some required Int field
          f2: Int!
        }
      `
      );
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

  it('get() should return type by path', () => {
    const tc = new InputTypeComposer(
      new GraphQLInputObjectType({
        name: 'Writable',
        fields: {
          field1: {
            type: GraphQLString,
          },
        },
      })
    );

    expect(tc.get('field1')).equal(GraphQLString);
  });

  it('should have chainable methods', () => {
    const itc = InputTypeComposer.create('InputType');
    expect(itc.setFields({})).equal(itc);
    expect(itc.setField('f1', 'String')).equal(itc);
    expect(itc.addFields({})).equal(itc);
    expect(itc.removeField('f1')).equal(itc);
    expect(itc.extendField('f1', {})).equal(itc);
    expect(itc.makeRequired('f1')).equal(itc);
    expect(itc.makeOptional('f1')).equal(itc);
    expect(itc.setTypeName('InputType2')).equal(itc);
    expect(itc.setDescription('Test')).equal(itc);
  });
});
