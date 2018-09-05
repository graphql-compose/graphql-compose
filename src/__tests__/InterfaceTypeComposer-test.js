/* @flow strict */

import {
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLInterfaceType,
} from '../graphql';
import { InterfaceTypeComposer, schemaComposer, TypeComposer } from '..';
import { graphqlVersion } from '../utils/graphqlVersion';

beforeEach(() => {
  schemaComposer.clear();
});

describe('InterfaceTypeComposer', () => {
  let objectType: GraphQLInterfaceType;
  let iftc: InterfaceTypeComposer;

  beforeEach(() => {
    objectType = new GraphQLInterfaceType({
      name: 'Readable',
      fields: {
        field1: { type: GraphQLString },
        field2: { type: GraphQLString },
      },
    });
    iftc = new InterfaceTypeComposer(objectType);
  });

  describe('fields manipulation', () => {
    it('getFields()', () => {
      const fieldNames = Object.keys(iftc.getFields());
      expect(fieldNames).toEqual(expect.arrayContaining(['field1', 'field2']));

      const iftc2 = InterfaceTypeComposer.create('SomeType');
      expect(iftc2.getFields()).toEqual({});
    });

    describe('getField()', () => {
      it('should return field config', () => {
        expect(iftc.getFieldType('field1')).toBe(GraphQLString);
      });

      it('should throw error if field does not exist', () => {
        expect(() => iftc.getField('unexisted')).toThrowError(/Cannot get field.*does not exist/);
      });
    });

    describe('setFields()', () => {
      it('should add field with standart config', () => {
        iftc.setFields({
          field3: { type: GraphQLString },
        });
        const fields = objectType.getFields();
        expect(Object.keys(fields)).toContain('field3');
        expect(fields.field3.type).toBe(GraphQLString);
      });

      it('should add fields with converting types from string to object', () => {
        iftc.setFields({
          field3: { type: 'String' },
          field4: { type: '[Int]' },
          field5: 'Boolean!',
        });

        expect(iftc.getFieldType('field3')).toBe(GraphQLString);
        expect(iftc.getFieldType('field4')).toBeInstanceOf(GraphQLList);
        expect((iftc.getFieldType('field4'): any).ofType).toBe(GraphQLInt);
        expect(iftc.getFieldType('field5')).toBeInstanceOf(GraphQLNonNull);
        expect((iftc.getFieldType('field5'): any).ofType).toBe(GraphQLBoolean);
      });

      it('should add fields with converting args types from string to object', () => {
        iftc.setFields({
          field3: {
            type: 'String',
            args: {
              arg1: { type: 'String!' },
              arg2: '[Float]',
            },
          },
        });

        expect(iftc.getFieldArgType('field3', 'arg1')).toBeInstanceOf(GraphQLNonNull);
        expect((iftc.getFieldArgType('field3', 'arg1'): any).ofType).toBe(GraphQLString);
        expect(iftc.getFieldArgType('field3', 'arg2')).toBeInstanceOf(GraphQLList);
        expect((iftc.getFieldArgType('field3', 'arg2'): any).ofType).toBe(GraphQLFloat);
      });

      it('should add projection via `setField` and `addFields`', () => {
        iftc.setFields({
          field3: {
            type: GraphQLString,
            projection: { field1: true, field2: true },
          },
          field4: { type: GraphQLString },
          field5: { type: GraphQLString, projection: { field4: true } },
        });
      });

      it('accept types as function', () => {
        const typeAsFn = () => GraphQLString;
        iftc.setFields({
          input3: { type: typeAsFn },
        });
        expect((iftc.getField('input3'): any).type).toBe(typeAsFn);
        expect(iftc.getFieldType('input3')).toBe(GraphQLString);

        // show provide unwrapped/unhoisted type for graphql
        if (graphqlVersion >= 14) {
          expect((iftc.getType(): any)._fields().input3.type).toBe(GraphQLString);
        } else {
          expect((iftc.getType(): any)._typeConfig.fields().input3.type).toBe(GraphQLString);
        }
      });

      it('accept fieldConfig as function', () => {
        iftc.setFields({
          input4: () => ({ type: 'String' }),
        });
        // show provide unwrapped/unhoisted type for graphql
        if (graphqlVersion >= 14) {
          expect((iftc.getType(): any)._fields().input4.type).toBe(GraphQLString);
        } else {
          expect((iftc.getType(): any)._typeConfig.fields().input4.type).toBe(GraphQLString);
        }
      });
    });

    it('addFields()', () => {
      iftc.addFields({
        field3: { type: GraphQLString },
        field4: { type: '[Int]' },
        field5: 'Boolean!',
      });
      expect(iftc.getFieldType('field3')).toBe(GraphQLString);
      expect(iftc.getFieldType('field4')).toBeInstanceOf(GraphQLList);
      expect((iftc.getFieldType('field4'): any).ofType).toBe(GraphQLInt);
      expect(iftc.getFieldType('field5')).toBeInstanceOf(GraphQLNonNull);
      expect((iftc.getFieldType('field5'): any).ofType).toBe(GraphQLBoolean);
    });

    describe('removeField()', () => {
      it('should remove one field', () => {
        iftc.removeField('field1');
        expect(iftc.getFieldNames()).toEqual(expect.arrayContaining(['field2']));
      });

      it('should remove list of fields', () => {
        iftc.removeField(['field1', 'field2']);
        expect(iftc.getFieldNames()).toEqual(expect.arrayContaining([]));
      });
    });

    describe('removeOtherFields()', () => {
      it('should remove one field', () => {
        iftc.removeOtherFields('field1');
        expect(iftc.getFieldNames()).not.toEqual(expect.arrayContaining(['field2']));
        expect(iftc.getFieldNames()).toEqual(expect.arrayContaining(['field1']));
      });

      it('should remove list of fields', () => {
        iftc.setField('field3', 'String');
        iftc.removeOtherFields(['field1', 'field2']);
        expect(iftc.getFieldNames()).toEqual(expect.arrayContaining(['field1', 'field2']));
        expect(iftc.getFieldNames()).not.toEqual(expect.arrayContaining(['field3']));
      });
    });

    describe('reorderFields()', () => {
      it('should change fields order', () => {
        iftc.setFields({ f1: 'Int', f2: 'Int', f3: 'Int' });
        expect(iftc.getFieldNames().join(',')).toBe('f1,f2,f3');
        iftc.reorderFields(['f3', 'f2', 'f1']);
        expect(iftc.getFieldNames().join(',')).toBe('f3,f2,f1');
      });

      it('should append not listed fields', () => {
        iftc.setFields({ f1: 'Int', f2: 'Int', f3: 'Int' });
        expect(iftc.getFieldNames().join(',')).toBe('f1,f2,f3');
        iftc.reorderFields(['f3']);
        expect(iftc.getFieldNames().join(',')).toBe('f3,f1,f2');
      });

      it('should skip non existed fields', () => {
        iftc.setFields({ f1: 'Int', f2: 'Int', f3: 'Int' });
        expect(iftc.getFieldNames().join(',')).toBe('f1,f2,f3');
        iftc.reorderFields(['f22', 'f3', 'f55', 'f1', 'f2']);
        expect(iftc.getFieldNames().join(',')).toBe('f3,f1,f2');
      });
    });

    describe('field arguments', () => {
      beforeEach(() => {
        iftc.extendField('field1', {
          args: {
            arg1: 'Int',
            arg2: 'String',
          },
        });
      });

      it('getFieldArgs()', () => {
        const args = iftc.getFieldArgs('field1');
        expect(Object.keys(args)).toEqual(['arg1', 'arg2']);
        expect(args.arg1.type).toBe(GraphQLInt);
        expect(iftc.getFieldArgType('field1', 'arg1')).toBe(GraphQLInt);
        expect(() => iftc.getFieldArgs('unexistedField')).toThrow();
      });

      it('hasFieldArg()', () => {
        expect(iftc.hasFieldArg('field1', 'arg1')).toBeTruthy();
        expect(iftc.hasFieldArg('field1', 'arg222')).toBeFalsy();
        expect(() => iftc.hasFieldArg('unexistedField', 'arg1')).toThrow();
      });

      it('getFieldArg()', () => {
        expect(iftc.getFieldArg('field1', 'arg1')).toBeTruthy();
        expect(() => iftc.getFieldArg('field1', 'arg222')).toThrow(
          /Cannot get arg.*Argument does not exist/
        );
        expect(() => iftc.hasFieldArg('unexistedField', 'arg1')).toThrow();
      });
    });

    describe('extendField()', () => {
      it('should extend existed fields', () => {
        iftc.setField('field3', {
          type: GraphQLString,
          projection: { field1: true, field2: true },
        });
        iftc.extendField('field3', {
          description: 'this is field #3',
        });
        expect(iftc.getFieldConfig('field3').type).toBe(GraphQLString);
        expect(iftc.getFieldConfig('field3').description).toBe('this is field #3');
        iftc.extendField('field3', {
          type: 'Int',
        });
        expect(iftc.getFieldType('field3')).toBe(GraphQLInt);
      });

      it('should work with fieldConfig as string', () => {
        iftc.setField('field4', 'String');
        iftc.extendField('field4', {
          description: 'this is field #4',
        });
        expect(iftc.getFieldConfig('field4').type).toBe(GraphQLString);
        expect(iftc.getFieldConfig('field4').description).toBe('this is field #4');
      });

      it('should throw error if field does not exists', () => {
        expect(() => iftc.extendField('unexisted', { description: '123' })).toThrow(
          /Cannot extend field.*Field does not exist/
        );
      });
    });

    it('isFieldNonNull()', () => {
      iftc.setField('fieldNN', 'String');
      expect(iftc.isFieldNonNull('fieldNN')).toBe(false);
      iftc.setField('fieldNN', 'String!');
      expect(iftc.isFieldNonNull('fieldNN')).toBe(true);
    });

    it('makeFieldNonNull()', () => {
      iftc.setField('fieldNN', 'String');
      expect(iftc.getFieldType('fieldNN')).toBe(GraphQLString);

      // should wrap with GraphQLNonNull
      iftc.makeFieldNonNull('fieldNN');
      expect(iftc.getFieldType('fieldNN')).toBeInstanceOf(GraphQLNonNull);
      expect((iftc.getFieldType('fieldNN'): any).ofType).toBe(GraphQLString);

      // should not wrap twice
      iftc.makeFieldNonNull('fieldNN');
      expect(iftc.getFieldType('fieldNN')).toBeInstanceOf(GraphQLNonNull);
      expect((iftc.getFieldType('fieldNN'): any).ofType).toBe(GraphQLString);
    });

    it('makeFieldNullable()', () => {
      iftc.setField('fieldNN', 'String!');
      expect(iftc.getFieldType('fieldNN')).toBeInstanceOf(GraphQLNonNull);
      expect((iftc.getFieldType('fieldNN'): any).ofType).toBe(GraphQLString);

      // should unwrap with GraphQLNonNull
      iftc.makeFieldNullable('fieldNN');
      expect(iftc.getFieldType('fieldNN')).toBe(GraphQLString);

      // should work for already unwrapped type
      iftc.makeFieldNullable('fieldNN');
      expect(iftc.getFieldType('fieldNN')).toBe(GraphQLString);
    });
  });

  describe('create() [static method]', () => {
    it('should create Interface by typeName as a string', () => {
      const myIFTC = InterfaceTypeComposer.create('TypeStub');
      expect(myIFTC).toBeInstanceOf(InterfaceTypeComposer);
      expect(myIFTC.getType()).toBeInstanceOf(GraphQLInterfaceType);
      expect(myIFTC.getFields()).toEqual({});
    });

    it('should create Interface by type template string', () => {
      const myIFTC = InterfaceTypeComposer.create(
        `
        interface TestTypeTpl {
          f1: String
          # Description for some required Int field
          f2: Int!
        }
      `
      );
      expect(myIFTC).toBeInstanceOf(InterfaceTypeComposer);
      expect(myIFTC.getTypeName()).toBe('TestTypeTpl');
      expect(myIFTC.getFieldType('f1')).toBe(GraphQLString);
      expect(myIFTC.getFieldType('f2')).toBeInstanceOf(GraphQLNonNull);
      expect((myIFTC.getFieldType('f2'): any).ofType).toBe(GraphQLInt);
    });

    it('should create TC by GraphQLInterfaceTypeConfig', () => {
      const myIFTC = InterfaceTypeComposer.create({
        name: 'TestType',
        fields: {
          f1: {
            type: 'String',
          },
          f2: 'Int!',
        },
      });
      expect(myIFTC).toBeInstanceOf(InterfaceTypeComposer);
      expect(myIFTC.getFieldType('f1')).toBe(GraphQLString);
      expect(myIFTC.getFieldType('f2')).toBeInstanceOf(GraphQLNonNull);
      expect((myIFTC.getFieldType('f2'): any).ofType).toBe(GraphQLInt);
    });

    it('should create TC by GraphQLInterfaceType', () => {
      const objType = new GraphQLInterfaceType({
        name: 'TestTypeObj',
        fields: {
          f1: {
            type: GraphQLString,
          },
        },
      });
      const myIFTC = InterfaceTypeComposer.create(objType);
      expect(myIFTC).toBeInstanceOf(InterfaceTypeComposer);
      expect(myIFTC.getType()).toBe(objType);
      expect(myIFTC.getFieldType('f1')).toBe(GraphQLString);
    });

    it('should create type and store it in schemaComposer', () => {
      const SomeUserTC = InterfaceTypeComposer.create('SomeUser');
      expect(schemaComposer.getIFTC('SomeUser')).toBe(SomeUserTC);
    });

    it('createTemp() should not store type in schemaComposer', () => {
      InterfaceTypeComposer.createTemp('SomeUser');
      expect(schemaComposer.has('SomeUser')).toBeFalsy();
    });
  });

  describe('clone()', () => {
    it('should clone projection for fields', () => {
      iftc.setField('field3', {
        type: GraphQLString,
        projection: { field1: true, field2: true },
      });

      const iftc2 = iftc.clone('newObject');
      expect(iftc2.getField('field3')).toEqual(
        expect.objectContaining({
          type: GraphQLString,
          projection: { field1: true, field2: true },
        })
      );
    });
  });

  describe('get()', () => {
    it('should return type by path', () => {
      const myIFTC = new InterfaceTypeComposer(
        new GraphQLInterfaceType({
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
        })
      );

      expect(myIFTC.get('field1')).toBe(GraphQLString);
      expect(myIFTC.get('field1.@arg1')).toBe(GraphQLInt);
    });
  });

  describe('get type methods', () => {
    it('getTypePlural() should return wrapped type with GraphQLList', () => {
      expect(iftc.getTypePlural()).toBeInstanceOf(GraphQLList);
      expect(iftc.getTypePlural().ofType).toBe(iftc.getType());
    });

    it('getTypeNonNull() should return wrapped type with GraphQLNonNull', () => {
      expect(iftc.getTypeNonNull()).toBeInstanceOf(GraphQLNonNull);
      expect(iftc.getTypeNonNull().ofType).toBe(iftc.getType());
    });
  });

  it('should have chainable methods', () => {
    expect(iftc.setFields({})).toBe(iftc);
    expect(iftc.setField('f1', { type: 'Int' })).toBe(iftc);
    expect(iftc.extendField('f1', { description: 'Ok' })).toBe(iftc);
    expect(iftc.deprecateFields('f1')).toBe(iftc);
    expect(iftc.addFields({})).toBe(iftc);
    expect(iftc.removeField('f1')).toBe(iftc);
    expect(iftc.removeOtherFields('f1')).toBe(iftc);
    expect(iftc.reorderFields(['f1'])).toBe(iftc);
  });

  describe('deprecateFields()', () => {
    let iftc1: InterfaceTypeComposer;

    beforeEach(() => {
      iftc1 = InterfaceTypeComposer.create({
        name: 'MyType',
        fields: {
          name: 'String',
          age: 'Int',
          dob: 'Date',
        },
      });
    });

    it('should accept string', () => {
      iftc1.deprecateFields('name');
      expect(iftc1.getFieldConfig('name').deprecationReason).toBe('deprecated');
      expect(iftc1.getFieldConfig('age').deprecationReason).toBeUndefined();
      expect(iftc1.getFieldConfig('dob').deprecationReason).toBeUndefined();
    });

    it('should accept array of string', () => {
      iftc1.deprecateFields(['name', 'age']);
      expect(iftc1.getFieldConfig('name').deprecationReason).toBe('deprecated');
      expect(iftc1.getFieldConfig('age').deprecationReason).toBe('deprecated');
      expect(iftc1.getFieldConfig('dob').deprecationReason).toBeUndefined();
    });

    it('should accept object with fields and reasons', () => {
      iftc1.deprecateFields({
        age: 'dont use',
        dob: 'old field',
      });
      expect(iftc1.getFieldConfig('name').deprecationReason).toBeUndefined();
      expect(iftc1.getFieldConfig('age').deprecationReason).toBe('dont use');
      expect(iftc1.getFieldConfig('dob').deprecationReason).toBe('old field');
    });

    it('should throw error on unexisted field', () => {
      expect(() => {
        iftc1.deprecateFields('unexisted');
      }).toThrowError(/Cannot deprecate unexisted field/);

      expect(() => {
        iftc1.deprecateFields(['unexisted']);
      }).toThrowError(/Cannot deprecate unexisted field/);

      expect(() => {
        iftc1.deprecateFields({ unexisted: 'Deprecate reason' });
      }).toThrowError(/Cannot deprecate unexisted field/);
    });
  });

  describe('getFieldTC()', () => {
    const myIFTC = InterfaceTypeComposer.create('MyCustomType');
    myIFTC.addFields({
      scalar: 'String',
      list: '[Int]',
    });

    it('should throw error for non-object fields', () => {
      expect(() => {
        myIFTC.getFieldTC('scalar');
      }).toThrow('field should be ObjectType');

      expect(() => {
        myIFTC.getFieldTC('list');
      }).toThrow('field should be ObjectType');
    });
  });

  describe('typeResolvers methods', () => {
    let PersonTC;
    let KindRedTC;
    let KindBlueTC;

    beforeEach(() => {
      PersonTC = TypeComposer.create(`
        type Person { age: Int, field1: String, field2: String }
      `);
      PersonTC.addInterface(iftc);
      iftc.addTypeResolver(PersonTC, value => {
        return value.hasOwnProperty('age');
      });

      KindRedTC = TypeComposer.create(`
        type KindRed { kind: String, field1: String, field2: String, red: String }
      `);
      KindRedTC.addInterface(iftc);
      iftc.addTypeResolver(KindRedTC, value => {
        return value.kind === 'red';
      });

      KindBlueTC = TypeComposer.create(`
        type KindBlue { kind: String, field1: String, field2: String, blue: String }
      `);
      KindBlueTC.addInterface(iftc);
      iftc.addTypeResolver(KindBlueTC, value => {
        return value.kind === 'blue';
      });
    });

    it('hasTypeResolver()', () => {
      expect(iftc.hasTypeResolver(PersonTC)).toBeTruthy();
      expect(iftc.hasTypeResolver(KindRedTC)).toBeTruthy();
      expect(iftc.hasTypeResolver(KindBlueTC)).toBeTruthy();
      expect(iftc.hasTypeResolver(TypeComposer.create('NewOne'))).toBeFalsy();
    });

    it('getTypeResolvers()', () => {
      const trm = iftc.getTypeResolvers();
      expect(trm).toBeInstanceOf(Map);
      expect(trm.size).toBe(3);
    });

    it('getTypeResolverCheckFn()', () => {
      const checkFn: any = iftc.getTypeResolverCheckFn(PersonTC);
      expect(checkFn({ age: 15 })).toBeTruthy();
      expect(checkFn({ nope: 'other type' })).toBeFalsy();
    });

    it('getTypeResolverNames()', () => {
      expect(iftc.getTypeResolverNames()).toEqual(
        expect.arrayContaining(['Person', 'KindRed', 'KindBlue'])
      );
    });

    it('getTypeResolverTypes()', () => {
      expect(iftc.getTypeResolverTypes()).toEqual(
        expect.arrayContaining([PersonTC.getType(), KindRedTC.getType(), KindBlueTC.getType()])
      );
    });

    describe('setTypeResolvers()', () => {
      it('async mode', async () => {
        const map = new Map([
          [PersonTC.getType(), async () => Promise.resolve(false)],
          [KindRedTC, async () => Promise.resolve(true)],
        ]);
        iftc.setTypeResolvers(map);

        const resolveType: any = iftc.gqType.resolveType;
        expect(resolveType()).toBeInstanceOf(Promise);
        expect(await resolveType()).toBe(KindRedTC.getType());
      });

      it('sync mode', () => {
        const map = new Map([
          [PersonTC.getType(), () => false],
          [KindRedTC, () => false],
          [KindBlueTC, () => true],
        ]);
        iftc.setTypeResolvers(map);

        const resolveType: any = iftc.gqType.resolveType;
        expect(resolveType()).toBe(KindBlueTC.getType());
      });

      it('throw error on wrong type', () => {
        expect(() => {
          const map: any = new Map([[false, () => true]]);
          iftc.setTypeResolvers(map);
        }).toThrowError();
      });

      it('throw error on wrong checkFn', () => {
        expect(() => {
          const map: any = new Map([[PersonTC, true]]);
          iftc.setTypeResolvers(map);
        }).toThrowError();
      });
    });

    it('addTypeResolver()', () => {
      const fn = () => false;
      iftc.addTypeResolver(PersonTC, fn);
      expect(iftc.getTypeResolverCheckFn(PersonTC)).toBe(fn);

      expect(() => {
        (iftc: any).addTypeResolver(PersonTC);
      }).toThrowError();
    });

    it('removeTypeResolver()', () => {
      expect(iftc.hasTypeResolver(PersonTC)).toBeTruthy();
      iftc.removeTypeResolver(PersonTC);
      expect(iftc.hasTypeResolver(PersonTC)).toBeFalsy();
    });
  });
});
