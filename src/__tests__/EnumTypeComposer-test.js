/* @flow strict */

import { schemaComposer, SchemaComposer } from '..';
import { EnumTypeComposer } from '../EnumTypeComposer';
import { GraphQLList, GraphQLNonNull, GraphQLEnumType } from '../graphql';
import { graphqlVersion } from '../utils/graphqlVersion';

beforeEach(() => {
  schemaComposer.clear();
});

describe('EnumTypeComposer', () => {
  let enumType: GraphQLEnumType;
  let etc: EnumTypeComposer<any>;

  beforeEach(() => {
    enumType = new GraphQLEnumType({
      name: 'MyEnum',
      values: {
        VAL1: { value: 'VAL1' },
        VAL2: { value: 'VAL2' },
      },
    });

    etc = new EnumTypeComposer(enumType, schemaComposer);
  });

  describe('values manipulation', () => {
    it('getFields()', () => {
      const fieldNames = Object.keys(etc.getFields());
      expect(fieldNames).toEqual(expect.arrayContaining(['VAL1', 'VAL2']));
    });

    if (graphqlVersion >= 13) {
      it('getFields() from empty Enum', () => {
        const etc2 = EnumTypeComposer.create('SomeType', schemaComposer);
        expect(etc2.getFields()).toEqual({});
      });
    }

    describe('getField()', () => {
      it('should return value config', () => {
        expect(etc.getField('VAL1').value).toBe('VAL1');
      });

      it('should throw error if value does not exist', () => {
        expect(() => etc.getField('unexisted')).toThrowError(/Cannot get value.*does not exist/);
      });
    });

    describe('setFields()', () => {
      it('should set fields with standart config', () => {
        etc.setFields({
          VAL3: { value: 'VAL3', description: 'Added value' },
        });

        expect(enumType.getValue('VAL1')).toBeUndefined();
        expect(enumType.getValue('VAL2')).toBeUndefined();

        const valueConfig: any = enumType.getValue('VAL3');
        expect(valueConfig.value).toBe('VAL3');
        expect(valueConfig.description).toBe('Added value');
      });
    });

    it('addFields()', () => {
      etc.addFields({
        VAL3: {},
        VAL4: { value: 'VAL4', description: 'Val4 description' },
      });
      expect(enumType.getValue('VAL1')).toBeDefined();
      expect(enumType.getValue('VAL2')).toBeDefined();
      expect(enumType.getValue('VAL3')).toBeDefined();
      const valueConfig: any = enumType.getValue('VAL4');
      expect(valueConfig.value).toBe('VAL4');
      expect(valueConfig.description).toBe('Val4 description');
    });

    describe('removeField()', () => {
      it('should remove one field', () => {
        etc.removeField('VAL1');
        expect(etc.getFieldNames()).toEqual(expect.arrayContaining(['VAL2']));
      });

      it('should remove list of fields', () => {
        etc.removeField(['VAL1', 'VAL2']);
        expect(etc.getFieldNames()).toEqual([]);
      });
    });

    describe('removeOtherFields()', () => {
      it('should remove one field', () => {
        etc.removeOtherFields('VAL1');
        expect(etc.getFieldNames()).toEqual(['VAL1']);
      });

      it('should remove list of fields', () => {
        etc.setField('VAL3', {});
        expect(etc.getFieldNames()).toEqual(expect.arrayContaining(['VAL3']));

        etc.removeOtherFields(['VAL1', 'VAL2']);
        expect(etc.getFieldNames()).toEqual(['VAL1', 'VAL2']);
      });
    });

    describe('reorderFields()', () => {
      it('should change fields order', () => {
        etc.setFields({ f1: {}, f2: {}, f3: {} });
        expect(etc.getFieldNames().join(',')).toBe('f1,f2,f3');
        etc.reorderFields(['f3', 'f2', 'f1']);
        expect(etc.getFieldNames().join(',')).toBe('f3,f2,f1');
      });

      it('should append not listed fields', () => {
        etc.setFields({ f1: {}, f2: {}, f3: {} });
        expect(etc.getFieldNames().join(',')).toBe('f1,f2,f3');
        etc.reorderFields(['f3']);
        expect(etc.getFieldNames().join(',')).toBe('f3,f1,f2');
      });

      it('should skip non existed fields', () => {
        etc.setFields({ f1: {}, f2: {}, f3: {} });
        expect(etc.getFieldNames().join(',')).toBe('f1,f2,f3');
        etc.reorderFields(['f22', 'f3', 'f55', 'f1', 'f2']);
        expect(etc.getFieldNames().join(',')).toBe('f3,f1,f2');
      });
    });

    describe('extendField()', () => {
      it('should extend existed fields', () => {
        etc.setField('VAL3', {});
        etc.extendField('VAL3', {
          description: 'this is field #3',
        });
        expect(etc.getField('VAL3').value).toBe('VAL3');
        expect(etc.getField('VAL3').description).toBe('this is field #3');
        etc.extendField('VAL3', {
          deprecationReason: 'Do not use',
        });
        expect(etc.getField('VAL3').deprecationReason).toBe('Do not use');
      });

      it('should throw error if field does not exists', () => {
        expect(() => etc.extendField('unexisted', { description: '123' })).toThrow(
          /Cannot extend value.*Value does not exist/
        );
      });
    });
  });

  describe('create() [static method]', () => {
    if (graphqlVersion >= 13) {
      it('should create ETC by typeName as a string', () => {
        const myTC = EnumTypeComposer.create('TypeStub', schemaComposer);
        expect(myTC).toBeInstanceOf(EnumTypeComposer);
        expect(myTC.getType()).toBeInstanceOf(GraphQLEnumType);
        expect(myTC.getFields()).toEqual({});
      });
    }

    it('should create ETC by type template string', () => {
      const myTC = EnumTypeComposer.create('enum SDLEnum { V1 V2 V3 }', schemaComposer);
      expect(myTC).toBeInstanceOf(EnumTypeComposer);
      expect(myTC.getTypeName()).toBe('SDLEnum');
      expect(myTC.getFieldNames()).toEqual(['V1', 'V2', 'V3']);
    });

    it('should create ETC by GraphQLEnumTypeConfig', () => {
      const myTC = EnumTypeComposer.create(
        {
          name: 'TestType',
          values: {
            v1: {},
            v2: {},
          },
        },
        schemaComposer
      );
      expect(myTC).toBeInstanceOf(EnumTypeComposer);
      expect(myTC.getTypeName()).toBe('TestType');
      expect(myTC.getFieldNames()).toEqual(['v1', 'v2']);
    });

    it('should create TC by GraphQLEnumType', () => {
      const objType = new GraphQLEnumType({
        name: 'TestTypeObj',
        values: {
          v1: {},
          v2: {},
        },
      });
      const myTC = EnumTypeComposer.create(objType, schemaComposer);
      expect(myTC).toBeInstanceOf(EnumTypeComposer);
      expect(myTC.getType()).toBe(objType);
      expect(myTC.getFieldNames()).toEqual(['v1', 'v2']);
    });

    it('should create TC without values from string', () => {
      const myTC = EnumTypeComposer.create('MyEnum', schemaComposer);
      expect(myTC.getFieldNames()).toEqual([]);
    });

    it('should create type and store it in schemaComposer', () => {
      const SomeUserETC = EnumTypeComposer.create('SomeUserEnum', schemaComposer);
      expect(schemaComposer.getETC('SomeUserEnum')).toBe(SomeUserETC);
    });

    it('createTemp() should not store type in schemaComposer', () => {
      EnumTypeComposer.createTemp('SomeUserEnum');
      expect(schemaComposer.has('SomeUserEnum')).toBeFalsy();
    });
  });

  describe('type methods', () => {
    it('getType()', () => {
      expect(etc.getType()).toBeInstanceOf(GraphQLEnumType);
    });

    it('getTypeName()', () => {
      expect(etc.getTypeName()).toBe('MyEnum');
    });

    it('setTypeName()', () => {
      expect(etc.getTypeName()).toBe('MyEnum');
      etc.setTypeName('OtherName');
      expect(etc.getTypeName()).toBe('OtherName');
    });

    it('getTypePlural() should return wrapped type with GraphQLList', () => {
      expect(etc.getTypePlural()).toBeInstanceOf(GraphQLList);
      expect(etc.getTypePlural().ofType).toBe(etc.getType());
    });

    it('getTypeNonNull() should return wrapped type with GraphQLNonNull', () => {
      expect(etc.getTypeNonNull()).toBeInstanceOf(GraphQLNonNull);
      expect(etc.getTypeNonNull().ofType).toBe(etc.getType());
    });
  });

  describe('deprecateFields()', () => {
    it('should accept string', () => {
      etc.setFields({ f1: {}, f2: {}, f3: {} });
      etc.deprecateFields('f1');
      expect(etc.getField('f1').deprecationReason).toBe('deprecated');
      expect(etc.getField('f2').deprecationReason).toBeUndefined();
      expect(etc.getField('f3').deprecationReason).toBeUndefined();
    });

    it('should accept array of string', () => {
      etc.setFields({ f1: {}, f2: {}, f3: {} });
      etc.deprecateFields(['f1', 'f2']);
      expect(etc.getField('f1').deprecationReason).toBe('deprecated');
      expect(etc.getField('f2').deprecationReason).toBe('deprecated');
      expect(etc.getField('f3').deprecationReason).toBeUndefined();
    });

    it('should accept object with fields and reasons', () => {
      etc.setFields({ f1: {}, f2: {}, f3: {} });
      etc.deprecateFields({
        f2: 'dont use',
        f3: 'old field',
      });
      expect(etc.getField('f1').deprecationReason).toBeUndefined();
      expect(etc.getField('f2').deprecationReason).toBe('dont use');
      expect(etc.getField('f3').deprecationReason).toBe('old field');
    });

    it('should throw error on unexisted field', () => {
      etc.setFields({ f1: {}, f2: {}, f3: {} });
      expect(() => {
        etc.deprecateFields('unexisted');
      }).toThrowError(/Cannot deprecate unexisted value/);

      expect(() => {
        etc.deprecateFields(['unexisted']);
      }).toThrowError(/Cannot deprecate unexisted value/);

      expect(() => {
        etc.deprecateFields({ unexisted: 'Deprecate reason' });
      }).toThrowError(/Cannot deprecate unexisted value/);
    });
  });

  describe('clone()', () => {
    it('should clone type', () => {
      const etc2 = etc.clone('ClonedEnum');
      expect(etc2.getTypeName()).toEqual('ClonedEnum');
      expect(etc.getType()).not.toBe(etc2.getType());
      expect(etc.getField('VAL1')).not.toBe(etc2.getField('VAL1'));

      expect(() => {
        const wrongArgs: any = [];
        etc.clone(...wrongArgs);
      }).toThrowError(/You should provide newTypeName/);
    });
  });

  describe('directive methods', () => {
    it('type level directive methods', () => {
      const tc1 = schemaComposer.createEnumTC(`
        enum My1 @d0(a: false) @d1(b: "3") @d0(a: true) { 
          AAA
        }`);
      expect(tc1.getDirectives()).toEqual([
        { args: { a: false }, name: 'd0' },
        { args: { b: '3' }, name: 'd1' },
        { args: { a: true }, name: 'd0' },
      ]);
      expect(tc1.getDirectiveNames()).toEqual(['d0', 'd1', 'd0']);
      expect(tc1.getDirectiveByName('d0')).toEqual({ a: false });
      expect(tc1.getDirectiveById(0)).toEqual({ a: false });
      expect(tc1.getDirectiveByName('d1')).toEqual({ b: '3' });
      expect(tc1.getDirectiveById(1)).toEqual({ b: '3' });
      expect(tc1.getDirectiveByName('d2')).toEqual(undefined);
      expect(tc1.getDirectiveById(333)).toEqual(undefined);
    });

    it('field level directive methods', () => {
      const tc1 = schemaComposer.createEnumTC(`
        enum My1 { 
          AAA @f0(a: false) @f1(b: "3") @f0(a: true)
        }`);
      expect(tc1.getFieldDirectives('AAA')).toEqual([
        { args: { a: false }, name: 'f0' },
        { args: { b: '3' }, name: 'f1' },
        { args: { a: true }, name: 'f0' },
      ]);
      expect(tc1.getFieldDirectiveNames('AAA')).toEqual(['f0', 'f1', 'f0']);
      expect(tc1.getFieldDirectiveByName('AAA', 'f0')).toEqual({ a: false });
      expect(tc1.getFieldDirectiveById('AAA', 0)).toEqual({ a: false });
      expect(tc1.getFieldDirectiveByName('AAA', 'f1')).toEqual({ b: '3' });
      expect(tc1.getFieldDirectiveById('AAA', 1)).toEqual({ b: '3' });
      expect(tc1.getFieldDirectiveByName('AAA', 'f2')).toEqual(undefined);
      expect(tc1.getFieldDirectiveById('AAA', 333)).toEqual(undefined);
    });
  });

  describe('merge()', () => {
    it('should merge with GraphQLEnumType', () => {
      const sortETC = schemaComposer.createEnumTC(`enum Sort { ID_ASC ID_DESC }`);
      const sort2 = new GraphQLEnumType({
        name: 'Sort2',
        values: {
          NAME_ASC: { value: 'name ASC' },
          NAME_DESC: { value: 'name DESC' },
          ID_DESC: { value: 'id DESC' },
        },
      });
      sortETC.merge(sort2);
      expect(sortETC.getFieldNames()).toEqual(['ID_ASC', 'ID_DESC', 'NAME_ASC', 'NAME_DESC']);
      expect(sortETC.getField('NAME_ASC').value).toEqual('name ASC');
      expect(sortETC.getField('ID_DESC').value).toEqual('id DESC');
    });

    it('should merge with EnumTypeComposer', () => {
      const sortETC = schemaComposer.createEnumTC(`enum Sort { ID_ASC ID_DESC }`);
      const sc2 = new SchemaComposer();
      const sort2 = sc2.createEnumTC(`enum Sort2 { NAME_ASC NAME_DESC ID_DESC }`);
      sortETC.merge(sort2);
      expect(sortETC.getFieldNames()).toEqual(['ID_ASC', 'ID_DESC', 'NAME_ASC', 'NAME_DESC']);
    });

    it('should throw error on wrong type', () => {
      const sortETC = schemaComposer.createEnumTC(`enum Sort { ID_ASC ID_DESC }`);
      expect(() => sortETC.merge((schemaComposer.createScalarTC('Scalar'): any))).toThrow(
        'Cannot merge ScalarTypeComposer'
      );
    });
  });
});
