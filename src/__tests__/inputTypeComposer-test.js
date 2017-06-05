/* @flow */

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
      expect(fieldNames).toEqual(expect.arrayContaining(['input1', 'input2']));
    });

    it('getFieldNames()', () => {
      const tc = new InputTypeComposer(objectType);
      expect(tc.getFieldNames()).toEqual(expect.arrayContaining(['input1', 'input2']));
    });

    it('hasField()', () => {
      const tc = new InputTypeComposer(objectType);
      expect(tc.hasField('input1')).toBe(true);
      expect(tc.hasField('missing')).toBe(false);
    });

    it('setField()', () => {
      const tc = new InputTypeComposer(objectType);
      tc.setField('input3', { type: GraphQLString });
      const fieldNames = Object.keys(objectType.getFields());
      expect(fieldNames).toContain('input3');
    });

    describe('setFields()', () => {
      it('accept regular fields definition', () => {
        const tc = new InputTypeComposer(objectType);
        tc.setFields({
          input3: { type: GraphQLString },
          input4: { type: GraphQLString },
        });
        expect(tc.getFieldNames()).not.toEqual(expect.arrayContaining(['input1', 'input2']));
        expect(tc.getFieldNames()).toEqual(expect.arrayContaining(['input3', 'input4']));
        expect(tc.getFieldType('input3')).toBe(GraphQLString);
        expect(tc.getFieldType('input4')).toBe(GraphQLString);
      });

      it('accept shortand fields definition', () => {
        const tc = new InputTypeComposer(objectType);
        tc.setFields({
          input3: GraphQLString,
          input4: 'String',
        });
        expect(tc.getFieldType('input3')).toBe(GraphQLString);
        expect(tc.getFieldType('input4')).toBe(GraphQLString);
      });

      it('accept types as function', () => {
        const tc = new InputTypeComposer(objectType);
        const typeAsFn = () => GraphQLString;
        tc.setFields({
          input3: { type: typeAsFn },
        });
        expect(tc.getFieldType('input3')).toBe(typeAsFn);

        // show provide unwrapped/unhoisted type for graphql
        expect(tc.getType()._typeConfig.fields().input3.type).toBe(GraphQLString);
      });
    });

    it('addFields()', () => {
      const tc = new InputTypeComposer(objectType);
      tc.addFields({
        input3: { type: GraphQLString },
        input4: { type: GraphQLString },
      });
      expect(tc.getFieldNames()).toEqual(
        expect.arrayContaining(['input1', 'input2', 'input3', 'input4'])
      );
    });

    it('removeField()', () => {
      const tc = new InputTypeComposer(objectType);
      tc.removeField('input1');
      expect(tc.getFieldNames()).not.toContain('input1');
      expect(tc.getFieldNames()).toContain('input2');
      tc.removeField(['input2', 'input3']);
      expect(tc.getFieldNames()).not.toContain('input2');
    });

    it('removeOtherFields()', () => {
      const cfg = {
        name: 'MyInput',
        fields: {
          input1: 'String',
          input2: 'String',
          input3: 'String',
        },
      };
      const tc = InputTypeComposer.create(cfg);
      tc.removeOtherFields('input1');
      expect(tc.getFieldNames()).toEqual(expect.arrayContaining(['input1']));
      expect(tc.getFieldNames()).not.toEqual(expect.arrayContaining(['input2', 'input3']));

      const tc2 = InputTypeComposer.create(cfg);
      tc2.removeOtherFields(['input1', 'input2']);
      expect(tc2.getFieldNames()).toEqual(expect.arrayContaining(['input1', 'input2']));
      expect(tc2.getFieldNames()).not.toEqual(expect.arrayContaining(['input3']));
    });

    describe('reorderFields()', () => {
      it('should change fields order', () => {
        const tcOrder = InputTypeComposer.create({
          name: 'Type',
          fields: { f1: 'Int', f2: 'Int', f3: 'Int ' },
        });
        expect(tcOrder.getFieldNames().join(',')).toBe('f1,f2,f3');
        tcOrder.reorderFields(['f3', 'f2', 'f1']);
        expect(tcOrder.getFieldNames().join(',')).toBe('f3,f2,f1');
      });

      it('should append not listed fields', () => {
        const tcOrder = InputTypeComposer.create({
          name: 'Type',
          fields: { f1: 'Int', f2: 'Int', f3: 'Int ' },
        });
        expect(tcOrder.getFieldNames().join(',')).toBe('f1,f2,f3');
        tcOrder.reorderFields(['f3']);
        expect(tcOrder.getFieldNames().join(',')).toBe('f3,f1,f2');
      });

      it('should skip non existed fields', () => {
        const tcOrder = InputTypeComposer.create({
          name: 'Type',
          fields: { f1: 'Int', f2: 'Int', f3: 'Int ' },
        });
        expect(tcOrder.getFieldNames().join(',')).toBe('f1,f2,f3');
        tcOrder.reorderFields(['f22', 'f3', 'f55', 'f1', 'f2']);
        expect(tcOrder.getFieldNames().join(',')).toBe('f3,f1,f2');
      });
    });

    it('should extend field by name', () => {
      const tc = new InputTypeComposer(objectType);
      tc.setField('input3', {
        type: GraphQLString,
      });
      tc.extendField('input3', {
        description: 'this is input #3',
      });
      expect(tc.getField('input3').type).toBe(GraphQLString);
      expect(tc.getField('input3').description).toBe('this is input #3');
      tc.extendField('input3', {
        type: 'Int',
      });
      expect(tc.getField('input3').type).toBe(GraphQLInt);
    });

    it('getFieldType()', () => {
      const tc = new InputTypeComposer(objectType);
      expect(tc.getFieldType('input1')).toBe(GraphQLString);
    });

    it('isRequired()', () => {
      const tc = new InputTypeComposer(objectType);
      expect(tc.isRequired('input1')).toBe(false);
    });

    it('makeRequired()', () => {
      const tc = new InputTypeComposer(objectType);
      tc.makeRequired('input1');
      expect(tc.getField('input1').type).toBeInstanceOf(GraphQLNonNull);
      expect(tc.getField('input1').type.ofType).toBe(GraphQLString);
      expect(tc.isRequired('input1')).toBe(true);
    });

    it('makeOptional()', () => {
      const tc = new InputTypeComposer(objectType);
      tc.makeRequired('input1');
      expect(tc.isRequired('input1')).toBe(true);
      tc.makeOptional('input1');
      expect(tc.isRequired('input1')).toBe(false);
    });

    it('should add fields with converting types from string to object', () => {
      const tc = new InputTypeComposer(objectType);
      tc.setField('input3', { type: 'String' });
      tc.addFields({
        input4: { type: '[Int]' },
        input5: { type: 'Boolean!' },
      });

      expect(tc.getField('input3').type).toBe(GraphQLString);
      expect(tc.getField('input4').type).toBeInstanceOf(GraphQLList);
      expect(tc.getField('input4').type.ofType).toBe(GraphQLInt);
      expect(tc.getField('input5').type).toBeInstanceOf(GraphQLNonNull);
      expect(tc.getField('input5').type.ofType).toBe(GraphQLBoolean);
    });
  });

  describe('type manipulation methods', () => {
    it('getType()', () => {
      const tc = new InputTypeComposer(objectType);
      expect(tc.getType()).toBeInstanceOf(GraphQLInputObjectType);
      expect(tc.getType().name).toBe('InputType');
    });

    it('getTypeAsRequired()', () => {
      const tc = new InputTypeComposer(objectType);
      expect(tc.getTypeAsRequired()).toBeInstanceOf(GraphQLNonNull);
      expect(tc.getTypeAsRequired().ofType.name).toBe('InputType');
    });

    it('getTypeName()', () => {
      const tc = new InputTypeComposer(objectType);
      expect(tc.getTypeName()).toBe('InputType');
    });

    it('setTypeName()', () => {
      const tc = new InputTypeComposer(objectType);
      tc.setTypeName('OtherInputType');
      expect(tc.getTypeName()).toBe('OtherInputType');
    });

    it('getDescription()', () => {
      const tc = new InputTypeComposer(objectType);
      expect(tc.getDescription()).toBe('Mock type');
    });

    it('setDescription()', () => {
      const tc = new InputTypeComposer(objectType);
      tc.setDescription('Changed description');
      expect(tc.getDescription()).toBe('Changed description');
    });
  });

  describe('static method create()', () => {
    it('should create ITC by typeName as a string', () => {
      const TC = InputTypeComposer.create('TypeStub');
      expect(TC).toBeInstanceOf(InputTypeComposer);
      expect(TC.getType()).toBeInstanceOf(GraphQLInputObjectType);
      expect(TC.getFields()).toEqual({});
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
      expect(TC).toBeInstanceOf(InputTypeComposer);
      expect(TC.getTypeName()).toBe('TestTypeTplInput');
      expect(TC.getFieldType('f1')).toBe(GraphQLString);
      expect(TC.getFieldType('f2')).toBeInstanceOf(GraphQLNonNull);
      expect(TC.getFieldType('f2').ofType).toBe(GraphQLInt);
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
      expect(TC).toBeInstanceOf(InputTypeComposer);
      expect(TC.getFieldType('f1')).toBe(GraphQLString);
      expect(TC.getFieldType('f2')).toBeInstanceOf(GraphQLNonNull);
      expect(TC.getFieldType('f2').ofType).toBe(GraphQLInt);
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
      expect(TC).toBeInstanceOf(InputTypeComposer);
      expect(TC.getType()).toBe(objType);
      expect(TC.getFieldType('f1')).toBe(GraphQLString);
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

    expect(tc.get('field1')).toBe(GraphQLString);
  });

  it('should have chainable methods', () => {
    const itc = InputTypeComposer.create('InputType');
    expect(itc.setFields({})).toBe(itc);
    expect(itc.setField('f1', 'String')).toBe(itc);
    expect(itc.extendField('f1', {})).toBe(itc);
    expect(itc.addFields({})).toBe(itc);
    expect(itc.removeField('f1')).toBe(itc);
    expect(itc.removeOtherFields('f1')).toBe(itc);
    expect(itc.reorderFields(['f1'])).toBe(itc);
    expect(itc.makeRequired('f1')).toBe(itc);
    expect(itc.makeOptional('f1')).toBe(itc);
    expect(itc.setTypeName('InputType2')).toBe(itc);
    expect(itc.setDescription('Test')).toBe(itc);
  });
});
