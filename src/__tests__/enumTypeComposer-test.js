/* @flow strict */

import { EnumTypeComposer } from '../';
import { GraphQLList, GraphQLNonNull, GraphQLEnumType } from '../graphql';
import { graphqlVersion } from '../utils/graphqlVersion';

describe('EnumTypeComposer', () => {
  let enumType: GraphQLEnumType;
  let etc: EnumTypeComposer;

  beforeEach(() => {
    enumType = new GraphQLEnumType({
      name: 'MyEnum',
      values: {
        VAL1: { value: 'VAL1' },
        VAL2: { value: 'VAL2' },
      },
    });

    etc = new EnumTypeComposer(enumType);
  });

  describe('values manipulation', () => {
    it('getFields()', () => {
      const fieldNames = Object.keys(etc.getFields());
      expect(fieldNames).toEqual(expect.arrayContaining(['VAL1', 'VAL2']));
    });

    if (graphqlVersion >= 13) {
      it('getFields() from empty Enum', () => {
        const etc2 = EnumTypeComposer.create('SomeType');
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
        const myTC = EnumTypeComposer.create('TypeStub');
        expect(myTC).toBeInstanceOf(EnumTypeComposer);
        expect(myTC.getType()).toBeInstanceOf(GraphQLEnumType);
        expect(myTC.getFields()).toEqual({});
      });
    }

    it('should create ETC by type template string', () => {
      const myTC = EnumTypeComposer.create('enum SDLEnum { V1 V2 V3 }');
      expect(myTC).toBeInstanceOf(EnumTypeComposer);
      expect(myTC.getTypeName()).toBe('SDLEnum');
      expect(myTC.getFieldNames()).toEqual(['V1', 'V2', 'V3']);
    });

    it('should create ETC by GraphQLEnumTypeConfig', () => {
      const myTC = EnumTypeComposer.create({
        name: 'TestType',
        values: {
          v1: {},
          v2: {},
        },
      });
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
      const myTC = EnumTypeComposer.create(objType);
      expect(myTC).toBeInstanceOf(EnumTypeComposer);
      expect(myTC.getType()).toBe(objType);
      expect(myTC.getFieldNames()).toEqual(['v1', 'v2']);
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
});
