/* @flow strict */

import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLInterfaceType,
  GraphQLInputObjectType,
  graphql,
} from '../graphql';
import { schemaComposer, SchemaComposer, sc } from '..';
import { Resolver } from '../Resolver';
import { ObjectTypeComposer } from '../ObjectTypeComposer';
import { InputTypeComposer } from '../InputTypeComposer';
import { InterfaceTypeComposer } from '../InterfaceTypeComposer';
import { ScalarTypeComposer } from '../ScalarTypeComposer';
import { EnumTypeComposer } from '../EnumTypeComposer';
import { UnionTypeComposer } from '../UnionTypeComposer';
import { NonNullComposer } from '../NonNullComposer';
import { ListComposer } from '../ListComposer';
import { ThunkComposer } from '../ThunkComposer';
import { graphqlVersion } from '../utils/graphqlVersion';
import { dedent } from '../utils/dedent';

beforeEach(() => {
  schemaComposer.clear();
});

describe('ObjectTypeComposer', () => {
  let tc: ObjectTypeComposer<any, any>;

  beforeEach(() => {
    const type = new GraphQLObjectType({
      name: 'Readable',
      fields: {
        field1: { type: GraphQLString },
        field2: { type: GraphQLString },
      },
    });
    tc = new ObjectTypeComposer(type, schemaComposer);
  });

  describe('fields manipulation', () => {
    it('getFields()', () => {
      const fieldNames = Object.keys(tc.getFields());
      expect(fieldNames).toEqual(expect.arrayContaining(['field1', 'field2']));

      const tc2 = ObjectTypeComposer.create('SomeType', schemaComposer);
      expect(tc2.getFields()).toEqual({});
    });

    describe('getField()', () => {
      it('should return field config', () => {
        expect(tc.getFieldType('field1')).toBe(GraphQLString);
      });

      it('should throw error if field does not exist', () => {
        expect(() => tc.getField('unexisted')).toThrowError(/Cannot get field.*does not exist/);
      });
    });

    describe('setFields()', () => {
      it('should add field with standart config', () => {
        tc.setFields({
          field3: { type: GraphQLString },
        });
        const fields = tc.getType().getFields();
        expect(Object.keys(fields)).toEqual(['field3']);
        expect(fields.field3.type).toBe(GraphQLString);
      });

      it('should add fields with converting types from string to object', () => {
        tc.setFields({
          field3: { type: 'String' },
          field4: { type: '[Int]' },
          field5: 'Boolean!',
        });

        expect(tc.getFieldType('field3')).toBe(GraphQLString);
        expect(tc.getFieldType('field4')).toBeInstanceOf(GraphQLList);
        expect((tc.getFieldType('field4'): any).ofType).toBe(GraphQLInt);
        expect(tc.getFieldType('field5')).toBeInstanceOf(GraphQLNonNull);
        expect((tc.getFieldType('field5'): any).ofType).toBe(GraphQLBoolean);
      });

      it('should add fields with converting args types from string to object', () => {
        tc.setFields({
          field3: {
            type: 'String',
            args: {
              arg1: { type: 'String!' },
              arg2: '[Float]',
            },
          },
        });

        expect(tc.getFieldArgType('field3', 'arg1')).toBeInstanceOf(GraphQLNonNull);
        expect((tc.getFieldArgType('field3', 'arg1'): any).ofType).toBe(GraphQLString);
        expect(tc.getFieldArgType('field3', 'arg2')).toBeInstanceOf(GraphQLList);
        expect((tc.getFieldArgType('field3', 'arg2'): any).ofType).toBe(GraphQLFloat);
        expect(tc.getFieldArgTypeName('field3', 'arg1')).toBe('String!');
        expect(tc.getFieldArgTypeName('field3', 'arg2')).toBe('[Float]');
      });

      it('should add projection via `setField` and `addFields`', () => {
        tc.setFields({
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
        tc.setFields({
          input3: { type: typeAsFn },
        });
        expect(tc.getField('input3').type).toBeInstanceOf(ThunkComposer);
        expect(tc.getFieldType('input3')).toBe(GraphQLString);

        // show provide unwrapped/unhoisted type for graphql
        if (graphqlVersion >= 14) {
          expect((tc.getType(): any)._fields().input3.type).toBe(GraphQLString);
        } else {
          expect((tc.getType(): any)._typeConfig.fields().input3.type).toBe(GraphQLString);
        }
      });

      it('accept thunked type', () => {
        tc.setFields({
          input4: () => 'String',
        });
        expect(tc.getField('input4').type).toBeInstanceOf(ThunkComposer);
        expect(tc.getFieldType('input4')).toBe(GraphQLString);
      });
    });

    it('addFields()', () => {
      tc.addFields({
        field3: { type: GraphQLString },
        field4: { type: '[Int]' },
        field5: 'Boolean!',
      });
      expect(tc.getFieldType('field3')).toBe(GraphQLString);
      expect(tc.getFieldType('field4')).toBeInstanceOf(GraphQLList);
      expect((tc.getFieldType('field4'): any).ofType).toBe(GraphQLInt);
      expect(tc.getFieldType('field5')).toBeInstanceOf(GraphQLNonNull);
      expect((tc.getFieldType('field5'): any).ofType).toBe(GraphQLBoolean);
      expect(tc.getFieldTypeName('field3')).toBe('String');
      expect(tc.getFieldTypeName('field4')).toBe('[Int]');
      expect(tc.getFieldTypeName('field5')).toBe('Boolean!');
    });

    it('addNestedFields()', () => {
      tc.addNestedFields({
        'fieldNested1.f1': { type: GraphQLString },
        fieldNested2: { type: '[Int]' },
        'fieldNested1.f2': 'Boolean!',
      });

      expect(tc.getFieldType('fieldNested1')).toBeInstanceOf(GraphQLObjectType);
      const fieldTC = tc.getFieldTC('fieldNested1');
      expect(fieldTC).toBeInstanceOf(ObjectTypeComposer);
      if (fieldTC instanceof ObjectTypeComposer) {
        expect(fieldTC.getTypeName()).toBe('ReadableFieldNested1');
        expect(fieldTC.getFieldType('f1')).toBe(GraphQLString);
        expect(fieldTC.getFieldType('f2')).toBeInstanceOf(GraphQLNonNull);
        expect((fieldTC.getFieldType('f2'): any).ofType).toBe(GraphQLBoolean);

        expect(tc.getFieldType('fieldNested2')).toBeInstanceOf(GraphQLList);
        expect((tc.getFieldType('fieldNested2'): any).ofType).toBe(GraphQLInt);
      }
    });

    describe('removeField()', () => {
      it('should remove one field', () => {
        tc.removeField('field1');
        expect(tc.getFieldNames()).toEqual(expect.arrayContaining(['field2']));
      });

      it('should remove list of fields', () => {
        tc.removeField(['field1', 'field2']);
        expect(tc.getFieldNames()).toEqual(expect.arrayContaining([]));
      });

      it('should remove field via dot-notation', () => {
        sc.addTypeDefs(`
          type Type {
            field1: [SubType]!
            field2: Int
            field3: Int
          }

          type SubType {
            subField1: SubSubType!
            subField2: Int
            subField3: Int
          }

          type SubSubType {
            subSubField1: Int
            subSubField2: Int
          }
        `);

        sc.getOTC('Type').removeField([
          'field1.subField1.subSubField1',
          'field1.subField1.nonexistent',
          'field1.nonexistent.nonexistent',
          'field1.subField3',
          'field2',
          '',
          '..',
        ]);

        expect(sc.getOTC('Type').toSDL({ deep: true, omitDescriptions: true })).toEqual(dedent`
          type Type {
            field1: [SubType]!
            field3: Int
          }

          type SubType {
            subField1: SubSubType!
            subField2: Int
          }

          type SubSubType {
            subSubField2: Int
          }

          scalar Int
        `);
      });
    });

    describe('removeOtherFields()', () => {
      it('should remove one field', () => {
        tc.removeOtherFields('field1');
        expect(tc.getFieldNames()).not.toEqual(expect.arrayContaining(['field2']));
        expect(tc.getFieldNames()).toEqual(expect.arrayContaining(['field1']));
      });

      it('should remove list of fields', () => {
        tc.setField('field3', 'String');
        tc.removeOtherFields(['field1', 'field2']);
        expect(tc.getFieldNames()).toEqual(expect.arrayContaining(['field1', 'field2']));
        expect(tc.getFieldNames()).not.toEqual(expect.arrayContaining(['field3']));
      });
    });

    describe('reorderFields()', () => {
      it('should change fields order', () => {
        tc.setFields({ f1: 'Int', f2: 'Int', f3: 'Int' });
        expect(tc.getFieldNames().join(',')).toBe('f1,f2,f3');
        tc.reorderFields(['f3', 'f2', 'f1']);
        expect(tc.getFieldNames().join(',')).toBe('f3,f2,f1');
      });

      it('should append not listed fields', () => {
        tc.setFields({ f1: 'Int', f2: 'Int', f3: 'Int' });
        expect(tc.getFieldNames().join(',')).toBe('f1,f2,f3');
        tc.reorderFields(['f3']);
        expect(tc.getFieldNames().join(',')).toBe('f3,f1,f2');
      });

      it('should skip non existed fields', () => {
        tc.setFields({ f1: 'Int', f2: 'Int', f3: 'Int' });
        expect(tc.getFieldNames().join(',')).toBe('f1,f2,f3');
        tc.reorderFields(['f22', 'f3', 'f55', 'f1', 'f2']);
        expect(tc.getFieldNames().join(',')).toBe('f3,f1,f2');
      });
    });

    describe('field arguments', () => {
      beforeEach(() => {
        tc.extendField('field1', {
          args: {
            arg1: 'Int',
            arg2: 'String',
          },
        });
      });

      it('getFieldArgs()', () => {
        const args = tc.getFieldArgs('field1');
        expect(Object.keys(args)).toEqual(['arg1', 'arg2']);
        expect(args.arg1.type.getType()).toBe(GraphQLInt);
        expect(tc.getFieldArgType('field1', 'arg1')).toBe(GraphQLInt);
        expect(() => tc.getFieldArgs('unexistedField')).toThrow();
      });

      it('hasFieldArg()', () => {
        expect(tc.hasFieldArg('field1', 'arg1')).toBeTruthy();
        expect(tc.hasFieldArg('field1', 'arg222')).toBeFalsy();
        expect(tc.hasFieldArg('unexistedField', 'arg1')).toBeFalsy();
      });

      it('getFieldArg()', () => {
        expect(tc.getFieldArg('field1', 'arg1')).toBeTruthy();
        expect(() => tc.getFieldArg('field1', 'arg222')).toThrow(/Argument does not exist/);
        expect(tc.hasFieldArg('unexistedField', 'arg1')).toBeFalsy();
      });

      it('getFieldArgTC()', () => {
        tc.setField('fieldWithArgs', {
          type: 'Int',
          args: {
            scalarArg: '[Int]',
            complexArg: `input SomeInput { a: Int, b: Int }`,
          },
        });
        expect(tc.getFieldArgTC('fieldWithArgs', 'scalarArg')).toBeInstanceOf(ScalarTypeComposer);
        const argTC = tc.getFieldArgTC('fieldWithArgs', 'complexArg');
        expect(argTC).toBeInstanceOf(InputTypeComposer);
        // should return the same TC instance
        expect(tc.getFieldArgITC('fieldWithArgs', 'complexArg')).toBe(argTC);
        expect(() => tc.getFieldArgITC('fieldWithArgs', 'scalarArg')).toThrow(
          'must be InputTypeComposer'
        );
      });

      it('setFieldArgs()', () => {
        tc.setField('fieldForArgs', {
          type: 'Int',
        });
        expect(tc.getFieldArgs('fieldForArgs')).toEqual({});
        tc.setFieldArgs('fieldForArgs', { a: 'Int', b: { type: 'String' } });
        expect(tc.getFieldArgTypeName('fieldForArgs', 'a')).toEqual('Int');
        expect(tc.getFieldArgTypeName('fieldForArgs', 'b')).toEqual('String');
        expect(tc.setFieldArg('fieldForArgs', 'a', { type: 'Boolean' }));
        expect(tc.getFieldArgTypeName('fieldForArgs', 'a')).toEqual('Boolean');
        expect(tc.getFieldArgTypeName('fieldForArgs', 'b')).toEqual('String');
      });

      it('addFieldArgs()', () => {
        tc.setField('fieldForArgs', {
          type: 'Int',
          args: { x: 'Int' },
        });
        expect(tc.getFieldArgs('fieldForArgs')).toMatchObject({ x: {} });
        tc.addFieldArgs('fieldForArgs', { a: 'Int', b: { type: 'String' } });
        expect(tc.getFieldArgTypeName('fieldForArgs', 'a')).toEqual('Int');
        expect(tc.getFieldArgTypeName('fieldForArgs', 'b')).toEqual('String');
        expect(tc.getFieldArgs('fieldForArgs')).toMatchObject({ x: {}, a: {}, b: {} });
      });

      describe('removeFieldArg()', () => {
        it('should remove one arg', () => {
          tc.setField('fieldWithArgs', {
            type: 'Int',
            args: { a: 'Int', b: 'Int', c: 'Int' },
          });
          tc.removeFieldArg('fieldWithArgs', 'b');
          expect(tc.getFieldArgNames('fieldWithArgs')).toEqual(['a', 'c']);
        });

        it('should remove list of args', () => {
          tc.setField('fieldWithArgs', {
            type: 'Int',
            args: { a: 'Int', b: 'Int', c: 'Int' },
          });
          tc.removeFieldArg('fieldWithArgs', ['b', 'c']);
          expect(tc.getFieldArgNames('fieldWithArgs')).toEqual(['a']);
        });
      });

      describe('removeFieldOtherArgs()', () => {
        it('should remove one field', () => {
          tc.setField('fieldWithArgs', {
            type: 'Int',
            args: { a: 'Int', b: 'Int', c: 'Int' },
          });
          tc.removeFieldOtherArgs('fieldWithArgs', 'b');
          expect(tc.getFieldArgNames('fieldWithArgs')).toEqual(['b']);
        });

        it('should remove list of fields', () => {
          tc.setField('fieldWithArgs', {
            type: 'Int',
            args: { a: 'Int', b: 'Int', c: 'Int' },
          });
          tc.removeFieldOtherArgs('fieldWithArgs', ['b', 'c']);
          expect(tc.getFieldArgNames('fieldWithArgs')).toEqual(['b', 'c']);
        });
      });
    });

    describe('extendField()', () => {
      it('should extend existed fields', () => {
        tc.setField('field3', {
          type: GraphQLString,
          projection: { field1: true, field2: true },
        });
        tc.extendField('field3', {
          description: 'this is field #3',
        });
        expect(tc.getFieldConfig('field3').type).toBe(GraphQLString);
        expect(tc.getFieldConfig('field3').description).toBe('this is field #3');
        tc.extendField('field3', {
          type: 'Int',
        });
        expect(tc.getFieldType('field3')).toBe(GraphQLInt);
      });

      it('should extend field extensions', () => {
        tc.setField('field3', {
          type: GraphQLString,
          extensions: { first: true },
        });
        tc.extendField('field3', {
          description: 'this is field #3',
          extensions: { second: true },
        });
        expect(tc.getFieldConfig('field3').extensions).toEqual({
          first: true,
          second: true,
        });
      });

      it('should work with fieldConfig as string', () => {
        tc.setField('field4', 'String');
        tc.extendField('field4', {
          description: 'this is field #4',
        });
        expect(tc.getFieldConfig('field4').type).toBe(GraphQLString);
        expect(tc.getFieldConfig('field4').description).toBe('this is field #4');
      });

      it('should throw error if field does not exists', () => {
        expect(() => tc.extendField('unexisted', { description: '123' })).toThrow(
          /Cannot extend field.*Field does not exist/
        );
      });
    });

    it('isFieldNonNull()', () => {
      tc.setField('fieldNN', 'String');
      expect(tc.isFieldNonNull('fieldNN')).toBe(false);
      tc.setField('fieldNN', 'String!');
      expect(tc.isFieldNonNull('fieldNN')).toBe(true);
    });

    it('makeFieldNonNull()', () => {
      tc.setField('fieldNN', 'String');
      expect(tc.getFieldType('fieldNN')).toBe(GraphQLString);

      // should wrap with GraphQLNonNull
      tc.makeFieldNonNull('fieldNN');
      expect(tc.getFieldType('fieldNN')).toBeInstanceOf(GraphQLNonNull);
      expect((tc.getFieldType('fieldNN'): any).ofType).toBe(GraphQLString);

      // should not wrap twice
      tc.makeFieldNonNull('fieldNN');
      expect(tc.getFieldType('fieldNN')).toBeInstanceOf(GraphQLNonNull);
      expect((tc.getFieldType('fieldNN'): any).ofType).toBe(GraphQLString);
    });

    it('makeFieldNullable()', () => {
      tc.setField('fieldNN', 'String!');
      expect(tc.getFieldType('fieldNN')).toBeInstanceOf(GraphQLNonNull);
      expect((tc.getFieldType('fieldNN'): any).ofType).toBe(GraphQLString);

      // should unwrap GraphQLNonNull
      tc.makeFieldNullable('fieldNN');
      expect(tc.getFieldType('fieldNN')).toBe(GraphQLString);

      // should work for already unwrapped type
      tc.makeFieldNullable('fieldNN');
      expect(tc.getFieldType('fieldNN')).toBe(GraphQLString);
    });

    it('check field Plural methods, wrap/unwrap from ListComposer', () => {
      tc.setFields({
        b1: { type: new GraphQLNonNull(GraphQLString) },
        b2: { type: '[String]' },
        b3: 'String!',
        b4: '[String!]!',
      });
      expect(tc.isFieldPlural('b1')).toBe(false);
      expect(tc.isFieldPlural('b2')).toBe(true);
      expect(tc.isFieldPlural('b3')).toBe(false);
      expect(tc.isFieldPlural('b4')).toBe(true);
      expect(tc.isFieldNonNull('b1')).toBe(true);
      expect(tc.isFieldNonNull('b2')).toBe(false);
      expect(tc.isFieldNonNull('b3')).toBe(true);
      expect(tc.isFieldNonNull('b4')).toBe(true);

      tc.makeFieldPlural(['b1', 'b2', 'b3', 'unexisted']);
      expect(tc.isFieldPlural('b1')).toBe(true);
      expect(tc.isFieldPlural('b2')).toBe(true);
      expect(tc.isFieldPlural('b3')).toBe(true);

      tc.makeFieldNonNull('b2');
      expect(tc.isFieldPlural('b2')).toBe(true);
      expect(tc.isFieldNonNull('b2')).toBe(true);
      tc.makeFieldNonPlural(['b2', 'b4', 'unexisted']);
      expect(tc.isFieldPlural('b2')).toBe(false);
      expect(tc.isFieldNonNull('b2')).toBe(true);
      expect(tc.isFieldPlural('b4')).toBe(false);
      tc.makeFieldNullable(['b2', 'b4', 'unexisted']);
      expect(tc.isFieldNonNull('b2')).toBe(false);
      expect(tc.isFieldNonNull('b4')).toBe(false);
    });

    it('check Plural methods, wrap/unwrap from ListComposer', () => {
      tc.setFields({
        f: {
          type: 'Int',
          args: {
            b1: { type: new GraphQLNonNull(GraphQLString) },
            b2: { type: '[String]' },
            b3: 'String!',
            b4: '[String!]!',
          },
        },
      });
      expect(tc.isFieldArgPlural('f', 'b1')).toBe(false);
      expect(tc.isFieldArgPlural('f', 'b2')).toBe(true);
      expect(tc.isFieldArgPlural('f', 'b3')).toBe(false);
      expect(tc.isFieldArgPlural('f', 'b4')).toBe(true);
      expect(tc.isFieldArgNonNull('f', 'b1')).toBe(true);
      expect(tc.isFieldArgNonNull('f', 'b2')).toBe(false);
      expect(tc.isFieldArgNonNull('f', 'b3')).toBe(true);
      expect(tc.isFieldArgNonNull('f', 'b4')).toBe(true);

      tc.makeFieldArgPlural('f', ['b1', 'b2', 'b3', 'unexisted']);
      expect(tc.isFieldArgPlural('f', 'b1')).toBe(true);
      expect(tc.isFieldArgPlural('f', 'b2')).toBe(true);
      expect(tc.isFieldArgPlural('f', 'b3')).toBe(true);

      tc.makeFieldArgNonNull('f', 'b2');
      expect(tc.isFieldArgPlural('f', 'b2')).toBe(true);
      expect(tc.isFieldArgNonNull('f', 'b2')).toBe(true);
      tc.makeFieldArgNonPlural('f', ['b2', 'b4', 'unexisted']);
      expect(tc.isFieldArgPlural('f', 'b2')).toBe(false);
      expect(tc.isFieldArgNonNull('f', 'b2')).toBe(true);
      expect(tc.isFieldArgPlural('f', 'b4')).toBe(false);
      tc.makeFieldArgNullable('f', ['b2', 'b4', 'unexisted']);
      expect(tc.isFieldArgNonNull('f', 'b2')).toBe(false);
      expect(tc.isFieldArgNonNull('f', 'b4')).toBe(false);
    });
  });

  describe('interfaces manipulation', () => {
    const iface = new GraphQLInterfaceType({
      name: 'Node',
      description: '',
      fields: () => ({ id: { type: GraphQLInt } }),
      resolveType: () => {},
    });
    const iface2 = new GraphQLInterfaceType({
      name: 'Node2',
      description: '',
      fields: () => ({ id: { type: GraphQLInt } }),
      resolveType: () => {},
    });
    const iftc = InterfaceTypeComposer.create(
      `
      interface SimpleObject {
        id: Int
        name: String
      }
    `,
      schemaComposer
    );

    it('getInterfaces()', () => {
      const tc1 = schemaComposer.createObjectTC(`
        type Meee implements SimpleObject {
          id: Int
          name: String
        }
      `);
      expect(tc1.getInterfaces()).toHaveLength(1);
      expect(tc1.getInterfaces()[0].getTypeName()).toBe('SimpleObject');
    });

    it('hasInterface()', () => {
      const tc1 = schemaComposer.createObjectTC(`
        type Meee implements SimpleObject {
          id: Int
          name: String
        }
      `);
      expect(tc1.hasInterface('SimpleObject')).toBe(true);
    });

    it('hasInterface() should work by name or ITC', () => {
      const MyIface = new GraphQLInterfaceType({
        name: 'MyIface',
        description: '',
        fields: () => ({ id: { type: GraphQLInt } }),
        resolveType: () => {},
      });
      tc.addInterface(MyIface);
      expect(tc.hasInterface('MyIface123')).toBeFalsy();
      expect(tc.hasInterface('MyIface')).toBeTruthy();
      expect(tc.hasInterface(MyIface)).toBeTruthy();
      expect(tc.hasInterface(InterfaceTypeComposer.create(MyIface, schemaComposer))).toBeTruthy();

      tc.addInterface(InterfaceTypeComposer.create('MyIface123', schemaComposer));
      expect(tc.hasInterface('MyIface123')).toBeTruthy();
    });

    it('addInterface()', () => {
      tc.addInterface(iface);
      expect(tc.getInterfaces()).toHaveLength(1);
      expect(tc.hasInterface(iface)).toBe(true);
      tc.addInterface(iface2);
      expect(tc.getInterfaces()).toHaveLength(2);
      expect(tc.hasInterface(iface)).toBe(true);
      expect(tc.hasInterface(iface2)).toBe(true);
      tc.addInterface(iftc);
      expect(tc.hasInterface(iftc)).toBe(true);
    });

    it('removeInterface()', () => {
      tc.addInterface(iface);
      tc.addInterface(iface2);
      tc.addInterface(iftc);
      expect(tc.getInterfaces()).toHaveLength(3);
      expect(tc.hasInterface(iface)).toBe(true);
      expect(tc.hasInterface(iftc)).toBe(true);
      expect(tc.hasInterface(iface2)).toBe(true);
      tc.removeInterface(iface);
      tc.removeInterface(iftc);
      expect(tc.hasInterface(iface)).toBe(false);
      expect(tc.hasInterface(iftc)).toBe(false);
      expect(tc.hasInterface(iface2)).toBe(true);
    });

    it('check proper interface definition in GraphQLType', () => {
      tc.addInterface(iface);
      tc.addInterface(iface2);
      tc.addInterface(iftc);
      const gqType = tc.getType();
      const ifaces = gqType.getInterfaces();
      expect(ifaces[0]).toBeInstanceOf(GraphQLInterfaceType);
      expect(ifaces[1]).toBeInstanceOf(GraphQLInterfaceType);
      expect(ifaces[2]).toBeInstanceOf(GraphQLInterfaceType);
      expect(ifaces[0].name).toBe('Node');
      expect(ifaces[1].name).toBe('Node2');
      expect(ifaces[2].name).toBe('SimpleObject');
    });
  });

  describe('create() [static method]', () => {
    it('should create TC by typeName as a string', () => {
      const myTC = ObjectTypeComposer.create('TypeStub', schemaComposer);
      expect(myTC).toBeInstanceOf(ObjectTypeComposer);
      expect(myTC.getType()).toBeInstanceOf(GraphQLObjectType);
      expect(myTC.getFields()).toEqual({});
    });

    it('should create TC by SDL', () => {
      const myTC = ObjectTypeComposer.create(
        `
        type TestTypeTpl {
          f1: String
          # Description for some required Int field
          f2: Int!
        }
      `,
        schemaComposer
      );
      expect(myTC).toBeInstanceOf(ObjectTypeComposer);
      expect(myTC.getTypeName()).toBe('TestTypeTpl');
      expect(myTC.getFieldType('f1')).toBe(GraphQLString);
      expect(myTC.getFieldType('f2')).toBeInstanceOf(GraphQLNonNull);
      expect((myTC.getFieldType('f2'): any).ofType).toBe(GraphQLInt);
    });

    it('should create TC by GraphQLObjectTypeConfig', () => {
      const myTC = ObjectTypeComposer.create(
        {
          name: 'TestType',
          fields: {
            f1: {
              type: 'String',
            },
            f2: 'Int!',
          },
        },
        schemaComposer
      );
      expect(myTC).toBeInstanceOf(ObjectTypeComposer);
      expect(myTC.getFieldType('f1')).toBe(GraphQLString);
      expect(myTC.getFieldType('f2')).toBeInstanceOf(GraphQLNonNull);
      expect((myTC.getFieldType('f2'): any).ofType).toBe(GraphQLInt);
    });

    it('should create TC by ComposeObjectTypeConfig with unexisted types', () => {
      const myTC = ObjectTypeComposer.create(
        {
          name: 'TestType',
          fields: {
            f1: {
              type: 'Type1',
            },
            f2: 'Type2!',
          },
          interfaces: [
            `interface IFace { f1: Type1 }`,
            schemaComposer.createInterfaceTC({ name: 'IFace2', fields: { f1: 'Type1' } }),
          ],
        },
        schemaComposer
      );
      expect(myTC).toBeInstanceOf(ObjectTypeComposer);
      expect(myTC.getField('f1').type.getTypeName()).toEqual('Type1');
      expect(myTC.getField('f2').type.getTypeName()).toEqual('Type2!');
      expect(myTC.hasInterface('IFace')).toBeTruthy();
      expect(myTC.hasInterface('IFace2')).toBeTruthy();

      schemaComposer.createObjectTC(`type Type1 { a: Int }`);
      schemaComposer.createObjectTC(`type Type2 { a: Int }`);

      const graphqlType = myTC.getType();
      expect(graphqlType).toBeInstanceOf(GraphQLObjectType);
      const graphqlIFaces = graphqlType.getInterfaces();
      expect(graphqlIFaces[0]).toBeInstanceOf(GraphQLInterfaceType);
      expect(graphqlIFaces[1]).toBeInstanceOf(GraphQLInterfaceType);
    });

    it('should create TC by GraphQLObjectTypeConfig with fields as Thunk', () => {
      const myTC = ObjectTypeComposer.create(
        {
          name: 'TestType',
          fields: (): any => ({
            f1: {
              type: 'String',
            },
            f2: 'Int!',
          }),
        },
        schemaComposer
      );
      expect(myTC).toBeInstanceOf(ObjectTypeComposer);
      expect(myTC.getFieldType('f1')).toBe(GraphQLString);
      expect(myTC.getFieldType('f2')).toBeInstanceOf(GraphQLNonNull);
      expect((myTC.getFieldType('f2'): any).ofType).toBe(GraphQLInt);
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
      const myTC = ObjectTypeComposer.create(objType, schemaComposer);
      expect(myTC).toBeInstanceOf(ObjectTypeComposer);
      expect(myTC.getType()).toBe(objType);
      expect(myTC.getFieldType('f1')).toBe(GraphQLString);
    });

    it('should create type and store it in schemaComposer', () => {
      const SomeUserTC = ObjectTypeComposer.create('SomeUser', schemaComposer);
      expect(schemaComposer.getOTC('SomeUser')).toBe(SomeUserTC);
    });

    it('should create type and NOTE store root types in schemaComposer', () => {
      ObjectTypeComposer.create('Query', schemaComposer);
      expect(schemaComposer.has('Query')).toBeFalsy();

      ObjectTypeComposer.create('Mutation', schemaComposer);
      expect(schemaComposer.has('Query')).toBeFalsy();

      ObjectTypeComposer.create('Subscription', schemaComposer);
      expect(schemaComposer.has('Query')).toBeFalsy();
    });

    it('createTemp() should not store type in schemaComposer', () => {
      ObjectTypeComposer.createTemp('SomeUser');
      expect(schemaComposer.has('SomeUser')).toBeFalsy();
    });
  });

  describe('clone()', () => {
    it('should clone type', () => {
      const cloned = tc.clone('NewObject');
      expect(cloned).not.toBe(tc);
      expect(cloned.getTypeName()).toBe('NewObject');
      expect(cloned.getFieldNames()).toEqual(tc.getFieldNames());
    });

    it('field types should not be cloned', () => {
      const UserTC = schemaComposer.createObjectTC(`type User { field1: String }`);
      tc.setField('user', UserTC);
      const cloned = tc.clone('NewObject');
      expect(cloned.getField('user').type).toBe(UserTC);
    });

    it('field config should be different', () => {
      const cloned = tc.clone('NewObject');
      cloned.setField('field4', 'String');
      expect(cloned.hasField('field4')).toBeTruthy();
      expect(tc.hasField('field4')).toBeFalsy();
    });

    it('field args should be different', () => {
      tc.setField('field3', {
        type: 'String',
        args: { a1: 'Int' },
      });
      const cloned = tc.clone('NewObject');

      cloned.setFieldArg('field3', 'a2', 'String');
      expect(cloned.hasFieldArg('field3', 'a2')).toBeTruthy();
      expect(tc.hasFieldArg('field3', 'a2')).toBeFalsy();
    });

    it('interfaces should be the same', () => {
      const iftc = schemaComposer.createInterfaceTC(`interface A { field1: String }`);
      tc.addInterface(iftc);
      const cloned = tc.clone('NewObject');
      expect(cloned.getInterfaces()).toEqual(tc.getInterfaces());
    });

    it('extensions should be different', () => {
      tc.setExtension('ext1', 123);
      tc.setFieldExtension('field2', 'ext2', 456);
      const cloned = tc.clone('NewObject');

      expect(cloned.getExtension('ext1')).toBe(123);
      cloned.setExtension('ext1', 300);
      expect(cloned.getExtension('ext1')).toBe(300);
      expect(tc.getExtension('ext1')).toBe(123);
      expect(cloned.getFieldExtension('field2', 'ext2')).toBe(456);
      cloned.setFieldExtension('field2', 'ext2', 600);
      expect(cloned.getFieldExtension('field2', 'ext2')).toBe(600);
      expect(tc.getFieldExtension('field2', 'ext2')).toBe(456);
    });

    it('resolvers should be cloned with only current type replacement', () => {
      const UserTC = schemaComposer.createObjectTC(`type User { field1: String }`);
      tc.setField('user', UserTC);
      tc.addResolver({
        name: 'findMany',
        type: [tc],
      });
      tc.addResolver({
        name: 'findUser',
        type: UserTC,
      });
      const cloned = tc.clone('NewObject');

      const findMany = tc.getResolver('findMany');
      const findManyCloned = cloned.getResolver('findMany');
      expect(findMany).not.toBe(findManyCloned);
      // replace type even it wrapped with List or any other modifier
      expect(findMany.type.getTypeName()).toBe('[Readable]');
      expect(findManyCloned.type.getTypeName()).toBe('[NewObject]');

      // other types should stay as is
      const findUser = tc.getResolver('findUser');
      const findUserCloned = cloned.getResolver('findUser');
      expect(findUser).not.toBe(findUserCloned);
      expect(findUser.type).toBe(findUserCloned.type);
      expect(findUserCloned.type.getTypeName()).toBe('User');
    });
  });

  describe('cloneTo()', () => {
    let anotherSchemaComposer;
    beforeEach(() => {
      anotherSchemaComposer = new SchemaComposer();
    });

    it('should clone type', () => {
      const cloned = tc.cloneTo(anotherSchemaComposer);
      expect(cloned).not.toBe(tc);
      expect(cloned.getTypeName()).toBe(tc.getTypeName());
      expect(cloned.getFieldNames()).toEqual(tc.getFieldNames());
    });

    it('field types should be cloned too', () => {
      const UserTC = schemaComposer.createObjectTC(`type User { field1: String }`);
      tc.setField('user', UserTC);
      const cloned = tc.cloneTo(anotherSchemaComposer);
      expect(cloned.getField('user').type).not.toBe(UserTC);
      expect(cloned.getFieldTypeName('user')).toBe(tc.getFieldTypeName('user'));
    });

    it('field config should be different', () => {
      const cloned = tc.cloneTo(anotherSchemaComposer);
      cloned.setField('field4', 'String');
      expect(cloned.hasField('field4')).toBeTruthy();
      expect(tc.hasField('field4')).toBeFalsy();
    });

    it('field args should be different', () => {
      tc.setField('field3', {
        type: 'String',
        args: { a1: 'Int' },
      });
      const cloned = tc.cloneTo(anotherSchemaComposer);

      cloned.setFieldArg('field3', 'a2', 'String');
      expect(cloned.hasFieldArg('field3', 'a2')).toBeTruthy();
      expect(tc.hasFieldArg('field3', 'a2')).toBeFalsy();
    });

    it('interfaces should be different', () => {
      const iftc = schemaComposer.createInterfaceTC(`interface A { field1: String }`);
      tc.addInterface(iftc);
      const cloned = tc.cloneTo(anotherSchemaComposer);

      const ifaceA: InterfaceTypeComposer<any, any> = (tc.getInterfaces()[0]: any);
      const ifaceACloned: InterfaceTypeComposer<any, any> = (cloned.getInterfaces()[0]: any);
      expect(ifaceA).not.toBe(ifaceACloned);
      expect(ifaceA.getTypeName()).toBe(ifaceACloned.getTypeName());
      expect(ifaceA.getFieldNames()).toEqual(ifaceACloned.getFieldNames());
    });

    it('extensions should be different', () => {
      tc.setExtension('ext1', 123);
      tc.setFieldExtension('field2', 'ext2', 456);
      const cloned = tc.cloneTo(anotherSchemaComposer);

      expect(cloned.getExtension('ext1')).toBe(123);
      cloned.setExtension('ext1', 300);
      expect(cloned.getExtension('ext1')).toBe(300);
      expect(tc.getExtension('ext1')).toBe(123);
      expect(cloned.getFieldExtension('field2', 'ext2')).toBe(456);
      cloned.setFieldExtension('field2', 'ext2', 600);
      expect(cloned.getFieldExtension('field2', 'ext2')).toBe(600);
      expect(tc.getFieldExtension('field2', 'ext2')).toBe(456);
    });

    it('resolvers should be cloned with all subtypes', () => {
      const UserTC = schemaComposer.createObjectTC(`type User { field1: String }`);
      tc.setField('user', UserTC);
      tc.addResolver({
        name: 'findMany',
        type: [tc],
      });
      tc.addResolver({
        name: 'findUser',
        type: UserTC,
      });
      const cloned = tc.cloneTo(anotherSchemaComposer);

      const findMany = tc.getResolver('findMany');
      const findManyCloned = cloned.getResolver('findMany');
      expect(findMany).not.toBe(findManyCloned);
      // replace type even it wrapped with List or any other modifier
      expect(findMany.type.getTypeName()).toBe('[Readable]');
      expect(findManyCloned.type.getTypeName()).toBe('[Readable]');
      expect((findMany: any).type.ofType).not.toBe((findManyCloned: any).type.ofType);

      // other types also should be cloned
      const findUser = tc.getResolver('findUser');
      const findUserCloned = cloned.getResolver('findUser');
      expect(findUser).not.toBe(findUserCloned);
      expect(findUser.type).not.toBe(findUserCloned.type);
      expect(findUserCloned.type.getTypeName()).toBe('User');
    });
  });

  describe('get()', () => {
    it('should return type by path', () => {
      const myTC: any = new ObjectTypeComposer(
        new GraphQLObjectType({
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
        }),
        schemaComposer
      );

      expect(myTC.get('field1').getType()).toBe(GraphQLString);
      expect(myTC.get('field1.@arg1').getType()).toBe(GraphQLInt);
    });
  });

  describe('Resolvers manipulation', () => {
    it('addResolver() should accept Resolver instance', () => {
      const resolver = new Resolver(
        {
          name: 'myResolver',
        },
        schemaComposer
      );
      tc.addResolver(resolver);
      expect(tc.getResolver('myResolver')).toBe(resolver);
      expect(tc.hasResolver('myResolver')).toBe(true);
      expect(tc.hasResolver('myResolverXXX')).toBe(false);
    });

    it('addResolver() should accept Resolver options and create instance', () => {
      const ResolverDefinition = {
        name: 'myResolver2',
      };
      tc.addResolver(ResolverDefinition);
      expect(tc.getResolver('myResolver2')).toBeInstanceOf(Resolver);
      expect(tc.getResolver('myResolver2').name).toBe('myResolver2');
    });

    it('addResolver() should add stub resolve method', () => {
      const ResolverDefinition = {
        name: 'myResolver3',
      };
      tc.addResolver(ResolverDefinition);
      expect(tc.getResolver('myResolver3').resolve((undefined: any))).toEqual({});
    });

    it('addResolver() should add extensions', () => {
      const resolverOpts = {
        name: 'myResolver4',
        extensions: {
          journalDescription: 123,
        },
      };
      tc.addResolver(resolverOpts);
      expect(tc.getResolver('myResolver4').extensions).toEqual({ journalDescription: 123 });
    });

    it('removeResolver() should work', () => {
      const resolver = new Resolver(
        {
          name: 'myResolver3',
        },
        schemaComposer
      );
      tc.addResolver(resolver);
      expect(tc.hasResolver('myResolver3')).toBe(true);
      tc.removeResolver('myResolver3');
      expect(tc.hasResolver('myResolver3')).toBe(false);
      expect(() => tc.getResolver('myResolver3')).toThrowError(
        /does not have resolver with name 'myResolver3'/
      );
    });

    it('setResolver() should add resolver with specific name', () => {
      const resolver = new Resolver(
        {
          name: 'myResolver4',
        },
        schemaComposer
      );
      tc.setResolver('specName4', resolver);
      expect(tc.hasResolver('specName4')).toBe(true);
      expect(tc.hasResolver('myResolver4')).toBe(false);
    });

    it('getResolvers() should return Map', () => {
      expect(tc.getResolvers()).toBeInstanceOf(Map);
      tc.addResolver({
        name: 'myResolver5',
      });
      expect(Array.from(tc.getResolvers().keys())).toContain('myResolver5');
    });

    it('wrapResolverResolve() should wrap resolver resolve method', async () => {
      tc.addResolver({
        name: 'findById',
        resolve: () => '123',
      });
      expect(await tc.getResolver('findById').resolve(({}: any))).toBe('123');

      tc.wrapResolverResolve('findById', next => async rp => {
        const prev = await next(rp);
        return `${prev}456`;
      });
      expect(await tc.getResolver('findById').resolve(({}: any))).toBe('123456');
    });

    it('wrapResolver() should wrap resolver via callback', async () => {
      tc.addResolver({
        name: 'update',
        resolve: () => '123',
      });
      expect(await tc.getResolver('update').resolve(({}: any))).toBe('123');
      const prevResolver = tc.getResolver('update');

      tc.wrapResolver('update', resolver => {
        resolver.resolve = () => '456'; // eslint-disable-line
        return resolver;
      });
      expect(await tc.getResolver('update').resolve(({}: any))).toBe('456');
      expect(tc.getResolver('update')).not.toBe(prevResolver);
      expect(prevResolver.resolve((undefined: any))).toBe('123');
    });

    it('wrapResolverAs() should wrap resolver via callback with new name', async () => {
      tc.addResolver({
        name: 'update',
        args: {
          a: 'Int',
          b: 'String',
        },
        resolve: () => '123',
      });
      expect(await tc.getResolver('update').resolve(({}: any))).toBe('123');

      tc.wrapResolverAs('updateExt', 'update', resolver => {
        resolver.resolve = () => '456'; // eslint-disable-line
        resolver.addArgs({ c: 'Boolean' });
        return resolver;
      });
      expect(await tc.getResolver('updateExt').resolve(({}: any))).toBe('456');
      expect(await tc.getResolver('update').resolve(({}: any))).toBe('123');

      expect(tc.getResolver('update').getArgNames()).toEqual(['a', 'b']);
      expect(tc.getResolver('updateExt').getArgNames()).toEqual(['a', 'b', 'c']);
    });

    it('getResolver() with middlewares', async () => {
      const log = [];
      const mw1 = async (resolve, source, args, context, info) => {
        log.push('m1.before');
        const res = await resolve(source, args, context, info);
        log.push('m1.after');
        return res;
      };
      const mw2 = async (resolve, source, args, context, info) => {
        log.push('m2.before');
        const res = await resolve(source, args, context, info);
        log.push('m2.after');
        return res;
      };

      tc.addResolver({
        name: 'update',
        resolve: () => {
          log.push('call update');
          return '123';
        },
      });
      expect(await tc.getResolver('update', [mw1, mw2]).resolve(({}: any))).toBe('123');
      expect(log).toEqual(['m1.before', 'm2.before', 'call update', 'm2.after', 'm1.after']);
    });
  });

  describe('addRelation()', () => {
    let UserTC: ObjectTypeComposer<any, any>;
    let ArticleTC: ObjectTypeComposer<any, any>;

    beforeEach(() => {
      UserTC = ObjectTypeComposer.create(
        `
        type User {
          id: Int,
          name: String,
        }
      `,
        schemaComposer
      );
      UserTC.addResolver({
        name: 'findById',
        type: UserTC,
        resolve: () => null,
      });

      ArticleTC = ObjectTypeComposer.create(
        `
        type Article {
          id: Int,
          userId: Int,
          title: String,
        }
      `,
        schemaComposer
      );

      ArticleTC.addResolver({
        name: 'findOne',
        type: ArticleTC,
        resolve: () => null,
      });
    });

    describe('_relationWithResolverToFC()', () => {
      it('should return FieldConfig', () => {
        const fc: any = ArticleTC._relationWithResolverToFC({
          resolver: UserTC.getResolver('findById'),
        });
        expect(fc.type.getTypeName()).toBe('User');
      });

      it('should accept resolver as thunk and return FieldConfig', () => {
        const fc: any = ArticleTC._relationWithResolverToFC({
          resolver: () => UserTC.getResolver('findById'),
        });
        expect(fc.type.getTypeName()).toBe('User');
      });

      it('should throw error if provided incorrect Resolver instance', () => {
        expect(() =>
          ArticleTC._relationWithResolverToFC({
            resolver: ('abc': any),
          })
        ).toThrowError(/provide correct Resolver/);
      });

      it('should throw error if provided `type` property', () => {
        expect(() =>
          ArticleTC._relationWithResolverToFC({
            resolver: UserTC.getResolver('findById'),
            type: GraphQLInt,
          })
        ).toThrowError(/use `resolver` and `type`/);
      });

      it('should throw error if provided `resolve` property', () => {
        expect(() =>
          ArticleTC._relationWithResolverToFC({
            resolver: UserTC.getResolver('findById'),
            resolve: () => {},
          })
        ).toThrowError(/use `resolver` and `resolve`/);
      });
    });

    describe('thunk with Resolver', () => {
      it('should convert simple relation to fieldConfig', () => {
        ArticleTC.addRelation('user', {
          resolver: UserTC.getResolver('findById'),
        });
        const fc: any = ArticleTC.getType().getFields().user;
        expect(fc.type.name).toBe('User');
      });

      it('should convert simple relation to fieldConfig with resolver thunk', () => {
        ArticleTC.addRelation('user', {
          resolver: () => UserTC.getResolver('findById'),
        });
        const fc: any = ArticleTC.getType().getFields().user;
        expect(fc.type.name).toBe('User');
      });

      it('should convert unthunked simple relation to fieldConfig with resolver thunk', () => {
        ArticleTC.addRelation('user', {
          resolver: () => UserTC.getResolver('findById'),
        });
        const fc: any = ArticleTC.getType().getFields().user;
        expect(fc.type.name).toBe('User');
      });

      it('should convert cross related relations to fieldConfigs', () => {
        ArticleTC.addRelation('user', {
          resolver: UserTC.getResolver('findById'),
        });

        UserTC.addRelation('lastArticle', {
          resolver: ArticleTC.getResolver('findOne'),
        });

        const fc1: any = ArticleTC.getType().getFields().user;
        expect(fc1.type.name).toBe('User');

        const fc2: any = UserTC.getType().getFields().lastArticle;
        expect(fc2.type.name).toBe('Article');
      });
    });

    describe('thunk with FieldConfig', () => {
      it('should create field via buildRelations()', () => {
        ArticleTC.addRelation('user', {
          type: UserTC,
          resolve: () => {},
        });

        const fc: any = ArticleTC.getType().getFields().user;
        expect(fc.type).toBeInstanceOf(GraphQLObjectType);
        expect(fc.type.name).toBe('User');
      });
    });
  });

  describe('get type methods', () => {
    it('getTypePlural() should return wrapped type with ListComposer', () => {
      expect(tc.getTypePlural()).toBeInstanceOf(ListComposer);
      expect(tc.getTypePlural().getType().ofType).toBe(tc.getType());
    });

    it('getTypeNonNull() should return wrapped type with NonNullComposer', () => {
      expect(tc.getTypeNonNull()).toBeInstanceOf(NonNullComposer);
      expect(tc.getTypeNonNull().getType().ofType).toBe(tc.getType());
    });
  });

  it('should have chainable methods', () => {
    expect(tc.setFields({})).toBe(tc);
    expect(tc.setField('f1', { type: 'Int' })).toBe(tc);
    expect(tc.extendField('f1', { description: 'Ok' })).toBe(tc);
    expect(tc.deprecateFields('f1')).toBe(tc);
    expect(tc.addFields({})).toBe(tc);
    expect(tc.removeField('f1')).toBe(tc);
    expect(tc.removeOtherFields('f1')).toBe(tc);
    expect(tc.reorderFields(['f1'])).toBe(tc);

    expect(tc.addRelation('user', ({}: any))).toBe(tc);

    expect(tc.setInterfaces((['A', 'B']: any))).toBe(tc);
    expect(tc.addInterface(('A': any))).toBe(tc);
    expect(tc.removeInterface(('A': any))).toBe(tc);

    expect(tc.setResolver('myResolver', new Resolver({ name: 'myResolver' }, schemaComposer))).toBe(
      tc
    );
    expect(tc.addResolver(new Resolver({ name: 'myResolver' }, schemaComposer))).toBe(tc);
    expect(tc.removeResolver('myResolver')).toBe(tc);

    expect(tc.setTypeName('Type2')).toBe(tc);
    expect(tc.setDescription('Description')).toBe(tc);
    expect(tc.setRecordIdFn(() => ({}: any))).toBe(tc);
  });

  describe('deprecateFields()', () => {
    let tc1: ObjectTypeComposer<any, any>;

    beforeEach(() => {
      tc1 = ObjectTypeComposer.create(
        {
          name: 'MyType',
          fields: {
            name: 'String',
            age: 'Int',
            dob: 'Date',
          },
        },
        schemaComposer
      );
    });

    it('should accept string', () => {
      tc1.deprecateFields('name');
      expect(tc1.getFieldConfig('name').deprecationReason).toBe('deprecated');
      expect(tc1.getFieldConfig('age').deprecationReason).toBeUndefined();
      expect(tc1.getFieldConfig('dob').deprecationReason).toBeUndefined();
    });

    it('should accept array of string', () => {
      tc1.deprecateFields(['name', 'age']);
      expect(tc1.getFieldConfig('name').deprecationReason).toBe('deprecated');
      expect(tc1.getFieldConfig('age').deprecationReason).toBe('deprecated');
      expect(tc1.getFieldConfig('dob').deprecationReason).toBeUndefined();
    });

    it('should accept object with fields and reasons', () => {
      tc1.deprecateFields({
        age: 'dont use',
        dob: 'old field',
      });
      expect(tc1.getFieldConfig('name').deprecationReason).toBeUndefined();
      expect(tc1.getFieldConfig('age').deprecationReason).toBe('dont use');
      expect(tc1.getFieldConfig('dob').deprecationReason).toBe('old field');
    });

    it('should throw error on unexisted field', () => {
      expect(() => {
        tc1.deprecateFields('unexisted');
      }).toThrowError(/Cannot deprecate unexisted field/);

      expect(() => {
        tc1.deprecateFields(['unexisted']);
      }).toThrowError(/Cannot deprecate unexisted field/);

      expect(() => {
        tc1.deprecateFields({ unexisted: 'Deprecate reason' });
      }).toThrowError(/Cannot deprecate unexisted field/);
    });
  });

  describe('getFieldTC()', () => {
    const myTC = ObjectTypeComposer.create('MyCustomType', schemaComposer);
    myTC.addFields({
      scalar: 'String',
      list: '[Int]',
      obj: ObjectTypeComposer.create(`type MyCustomObjType { name: String }`, schemaComposer),
      objArr: [ObjectTypeComposer.create(`type MyCustomObjType2 { name: String }`, schemaComposer)],
      iface: InterfaceTypeComposer.create(
        `interface MyInterfaceType { field: String }`,
        schemaComposer
      ),
      enum: EnumTypeComposer.create(`enum MyEnumType { FOO BAR }`, schemaComposer),
      union: UnionTypeComposer.create(
        `union MyUnionType = MyCustomObjType | MyCustomObjType2`,
        schemaComposer
      ),
    });

    it('should return TypeComposer for object field', () => {
      const tco = myTC.getFieldTC('obj');
      expect(tco).toBeInstanceOf(ObjectTypeComposer);
      expect(tco.getTypeName()).toBe('MyCustomObjType');
    });

    it('should return TypeComposer for wrapped object field', () => {
      const tco = myTC.getFieldTC('objArr');
      expect(tco).toBeInstanceOf(ObjectTypeComposer);
      expect(tco.getTypeName()).toBe('MyCustomObjType2');
      // schould return the same TypeComposer instance
      const tco2 = myTC.getFieldOTC('objArr');
      expect(tco).toBe(tco2);
    });

    it('should return TypeComposer for scalar fields', () => {
      const tco = myTC.getFieldTC('scalar');
      expect(tco).toBeInstanceOf(ScalarTypeComposer);
      expect(tco.getTypeName()).toBe('String');
      expect(() => myTC.getFieldOTC('scalar')).toThrow('must be ObjectTypeComposer');
    });

    it('should return TypeComposer for scalar list fields', () => {
      const tco = myTC.getFieldTC('list');
      expect(tco).toBeInstanceOf(ScalarTypeComposer);
      expect(tco.getTypeName()).toBe('Int');
    });

    it('should return TypeComposer for enum fields', () => {
      const tco = myTC.getFieldTC('enum');
      expect(tco).toBeInstanceOf(EnumTypeComposer);
      expect(tco.getTypeName()).toBe('MyEnumType');
    });

    it('should return TypeComposer for interface list fields', () => {
      const tco = myTC.getFieldTC('iface');
      expect(tco).toBeInstanceOf(InterfaceTypeComposer);
      expect(tco.getTypeName()).toBe('MyInterfaceType');
    });

    it('should return TypeComposer for union list fields', () => {
      const tco = myTC.getFieldTC('union');
      expect(tco).toBeInstanceOf(UnionTypeComposer);
      expect(tco.getTypeName()).toBe('MyUnionType');
    });
  });

  describe('check isTypeOf methods', () => {
    it('check methods setIstypeOf() getIstypeOf()', () => {
      const tc1 = schemaComposer.createObjectTC('type A { f: Int }');
      expect(tc1.getIsTypeOf()).toBeUndefined();
      const isTypeOf = () => true;
      tc1.setIsTypeOf(isTypeOf);
      expect(tc1.getIsTypeOf()).toBe(isTypeOf);
    });

    it('integration test', async () => {
      const tc1 = schemaComposer.createObjectTC('type A { a: Int }');
      tc1.setIsTypeOf(source => {
        return source && source.kind === 'A';
      });
      const tc2 = schemaComposer.createObjectTC('type B { b: Int }');
      tc2.setIsTypeOf(source => {
        return source && source.kind === 'B';
      });
      schemaComposer.createUnionTC('union MyUnion = A | B');
      schemaComposer.Query.addFields({
        check: {
          type: '[MyUnion]',
          resolve: () => [
            { kind: 'A', a: 1 },
            { kind: 'B', b: 2 },
            { kind: 'C', c: 3 },
          ],
        },
      });
      const res = await graphql(
        schemaComposer.buildSchema(),
        `
          query {
            check {
              __typename
              ... on A {
                a
              }
              ... on B {
                b
              }
            }
          }
        `
      );
      expect(res.data).toEqual({
        check: [{ __typename: 'A', a: 1 }, { __typename: 'B', b: 2 }, null],
      });
    });
  });

  describe('InputType convert methods', () => {
    it('getInputType()', () => {
      const input = tc.getInputType();
      expect(input).toBeInstanceOf(GraphQLInputObjectType);
      // must return the same instance!
      expect(input).toBe(tc.getInputType());
    });

    it('hasInputTypeComposer()', () => {
      expect(tc.hasInputTypeComposer()).toBeFalsy();
      const input = tc.getInputType();
      expect(input).toBeInstanceOf(GraphQLInputObjectType);
      expect(tc.hasInputTypeComposer()).toBeTruthy();
    });

    it('setInputTypeComposer()', () => {
      const itc1 = InputTypeComposer.createTemp(`Input`);
      tc.setInputTypeComposer(itc1);
      const itc2 = tc.getInputTypeComposer();
      expect(itc1).toBe(itc2);
    });

    it('getInputTypeComposer()', () => {
      const itc = tc.getInputTypeComposer();
      expect(itc).toBeInstanceOf(InputTypeComposer);
      // must return the same instance!
      expect(itc).toBe(tc.getInputTypeComposer());
    });

    it('getITC()', () => {
      expect(tc.getITC()).toBe(tc.getInputTypeComposer());
    });

    it('removeInputTypeComposer()', () => {
      const tc3 = schemaComposer.createObjectTC(`
        type Point {
          x: Int
          y: Int
        }
      `);
      let itc3 = tc3.getInputTypeComposer();
      expect(itc3.getFieldNames()).toEqual(['x', 'y']);
      tc3.addFields({
        z: 'Int',
      });
      expect(itc3.getFieldNames()).toEqual(['x', 'y']);
      tc3.removeInputTypeComposer();
      itc3 = tc3.getInputTypeComposer();
      expect(itc3.getFieldNames()).toEqual(['x', 'y', 'z']);
    });
  });

  describe('directive methods', () => {
    it('type level directive get-methods', () => {
      const tc1 = schemaComposer.createObjectTC(`
        type My1 @d0(a: false) @d1(b: "3") @d0(a: true) { 
          field: Int
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
      const tc1 = schemaComposer.createObjectTC(`
        type My1 { 
          field: Int @f0(a: false) @f1(b: "3") @f0(a: true)
        }`);
      expect(tc1.getFieldDirectives('field')).toEqual([
        { args: { a: false }, name: 'f0' },
        { args: { b: '3' }, name: 'f1' },
        { args: { a: true }, name: 'f0' },
      ]);
      expect(tc1.getFieldDirectiveNames('field')).toEqual(['f0', 'f1', 'f0']);
      expect(tc1.getFieldDirectiveByName('field', 'f0')).toEqual({ a: false });
      expect(tc1.getFieldDirectiveById('field', 0)).toEqual({ a: false });
      expect(tc1.getFieldDirectiveByName('field', 'f1')).toEqual({ b: '3' });
      expect(tc1.getFieldDirectiveById('field', 1)).toEqual({ b: '3' });
      expect(tc1.getFieldDirectiveByName('field', 'f2')).toEqual(undefined);
      expect(tc1.getFieldDirectiveById('field', 333)).toEqual(undefined);
    });

    it('arg level directive methods', () => {
      const tc1 = schemaComposer.createObjectTC(`
        type My1 { 
          field(
            arg: Int @a0(a: false) @a1(b: "3") @a0(a: true)
          ): Int
        }`);
      expect(tc1.getFieldArgDirectives('field', 'arg')).toEqual([
        { args: { a: false }, name: 'a0' },
        { args: { b: '3' }, name: 'a1' },
        { args: { a: true }, name: 'a0' },
      ]);
      expect(tc1.getFieldArgDirectiveNames('field', 'arg')).toEqual(['a0', 'a1', 'a0']);
      expect(tc1.getFieldArgDirectiveByName('field', 'arg', 'a0')).toEqual({ a: false });
      expect(tc1.getFieldArgDirectiveById('field', 'arg', 0)).toEqual({ a: false });
      expect(tc1.getFieldArgDirectiveByName('field', 'arg', 'a1')).toEqual({ b: '3' });
      expect(tc1.getFieldArgDirectiveById('field', 'arg', 1)).toEqual({ b: '3' });
      expect(tc1.getFieldArgDirectiveByName('field', 'arg', 'a2')).toEqual(undefined);
      expect(tc1.getFieldArgDirectiveById('field', 'arg', 333)).toEqual(undefined);
    });

    it('check directive set-methods', () => {
      const tc1 = schemaComposer.createObjectTC(`
        type My1 @d0(a: true) {
          field: Int @d2(a: false, b: true)
          field2(ok: Int = 15 @d5(a: 5)): Int
        }
      `);
      expect(tc1.toSDL()).toBe(dedent`
        type My1 @d0(a: true) {
          field: Int @d2(a: false, b: true)
          field2(ok: Int = 15 @d5(a: 5)): Int
        }
      `);
      tc1.setDirectives([
        { args: { a: false }, name: 'd0' },
        { args: { b: '3' }, name: 'd1' },
        { args: { a: true }, name: 'd0' },
      ]);
      tc1.setFieldDirectives('field', [{ args: { b: '6' }, name: 'd1' }]);
      tc1.setFieldArgDirectives('field2', 'ok', [{ args: { b: '7' }, name: 'd1' }]);
      expect(tc1.toSDL()).toBe(dedent`
        type My1 @d0(a: false) @d1(b: "3") @d0(a: true) {
          field: Int @d1(b: "6")
          field2(ok: Int = 15 @d1(b: "7")): Int
        }
      `);
    });
  });

  describe('merge()', () => {
    it('should merge with GraphQLObjectType', () => {
      schemaComposer.createInterfaceTC(`interface IFace { name: String }`);
      const otc = schemaComposer.createObjectTC(`type User implements IFace { name: String }`);
      const person = new GraphQLObjectType({
        name: 'Person',
        interfaces: [
          new GraphQLInterfaceType({
            name: 'WithAge',
            fields: {
              age: { type: GraphQLInt },
            },
          }),
        ],
        fields: {
          age: { type: GraphQLInt },
        },
      });

      otc.merge(person);
      expect(otc.getFieldNames()).toEqual(['name', 'age']);
      expect(otc.hasInterface('IFace')).toBeTruthy();
      expect(otc.hasInterface('WithAge')).toBeTruthy();
    });

    it('should merge with ObjectTypeComposer', () => {
      schemaComposer.createInterfaceTC(`interface IFace { name: String }`);
      const otc = schemaComposer.createObjectTC(`type User implements IFace { name: String }`);
      const sc2 = new SchemaComposer();
      sc2.createInterfaceTC(`interface WithAge { age: Int }`);
      const person = sc2.createObjectTC(`type Person implements WithAge { age: Int }`);

      otc.merge(person);

      expect(otc.getFieldNames()).toEqual(['name', 'age']);
      expect(otc.hasInterface('IFace')).toBeTruthy();
      expect(otc.hasInterface('WithAge')).toBeTruthy();
    });

    it('should merge with GraphQLInterfaceType', () => {
      schemaComposer.createInterfaceTC(`interface IFace { name: String }`);
      const otc = schemaComposer.createObjectTC(`type User implements IFace { name: String }`);
      const iface = new GraphQLInterfaceType({
        name: 'WithAge',
        fields: {
          age: { type: GraphQLInt },
        },
      });

      otc.merge(iface);
      expect(otc.getFieldNames()).toEqual(['name', 'age']);
      expect(otc.hasInterface('IFace')).toBeTruthy();
    });

    it('should merge with InterfaceTypeComposer', () => {
      schemaComposer.createInterfaceTC(`interface IFace { name: String }`);
      const otc = schemaComposer.createObjectTC(`type User implements IFace { name: String }`);
      const sc2 = new SchemaComposer();
      const iface = sc2.createInterfaceTC(`interface WithAge { age: Int }`);

      otc.merge(iface);
      expect(otc.getFieldNames()).toEqual(['name', 'age']);
      expect(otc.hasInterface('IFace')).toBeTruthy();
    });

    it('should throw error on wrong type', () => {
      const otc = schemaComposer.createObjectTC(`type User { name: String }`);
      expect(() => otc.merge((schemaComposer.createScalarTC('Scalar'): any))).toThrow(
        'Cannot merge ScalarTypeComposer'
      );
    });
  });

  describe('misc methods', () => {
    it('getNestedTCs()', () => {
      const sc1 = new SchemaComposer();
      sc1.addTypeDefs(`
        type User implements I1 & I2 {
          f1: String
          f2: Int
          f3: User
          f4(f: Filter): Boolean 
        }

        input Filter { a: Int b: Filter }

        interface I1 { f1: String }
        interface I2 { f2: Int }

        type OtherType1 { a: Int }
        input OtherInput1 { b: Int }

        union C = A | B
        type A { f1: Int }
        type B { f2: User }
      `);

      expect(
        Array.from(
          sc1
            .getITC('Filter')
            .getNestedTCs()
            .values()
        ).map(t => t.getTypeName())
      ).toEqual(['Int', 'Filter']);

      expect(
        Array.from(
          sc1
            .getOTC('User')
            .getNestedTCs()
            .values()
        ).map(t => t.getTypeName())
      ).toEqual(['String', 'Int', 'User', 'Boolean', 'Filter', 'I1', 'I2']);

      expect(
        Array.from(
          sc1
            .getUTC('C')
            .getNestedTCs()
            .values()
        ).map(t => t.getTypeName())
      ).toEqual(['A', 'Int', 'B', 'User', 'String', 'Boolean', 'Filter', 'I1', 'I2']);
    });

    it('toSDL()', () => {
      const t = schemaComposer.createObjectTC(`
        """desc1"""
        type User { 
          """desc2"""
          name(a: Int): String
        }
      `);
      expect(t.toSDL()).toMatchInlineSnapshot(`
        "\\"\\"\\"desc1\\"\\"\\"
        type User {
          \\"\\"\\"desc2\\"\\"\\"
          name(a: Int): String
        }"
      `);
    });

    it('toSDL({ deep: true })', () => {
      const sc1 = new SchemaComposer();
      sc1.addTypeDefs(`
        type User implements I1 & I2 {
          f1: String
          f2: Int
          f3: User
          f4(f: Filter): Int 
        }

        input Filter { a: Boolean b: Filter }

        interface I1 { f1: String }
        interface I2 { f2: Int }

        type OtherType1 { a: Int }
        input OtherInput1 { b: Int }

        union C = A | B
        type A { f1: Int }
        type B { f2: User }
      `);

      expect(
        sc1.getOTC('User').toSDL({
          deep: true,
          omitDescriptions: true,
        })
      ).toMatchInlineSnapshot(`
        "type User implements I1 & I2 {
          f1: String
          f2: Int
          f3: User
          f4(f: Filter): Int
        }

        scalar String

        scalar Int

        input Filter {
          a: Boolean
          b: Filter
        }

        scalar Boolean

        interface I1 {
          f1: String
        }

        interface I2 {
          f2: Int
        }"
      `);

      expect(
        sc1.getOTC('User').toSDL({
          deep: true,
          omitDescriptions: true,
          exclude: ['I2', 'I1', 'Filter', 'Int'],
        })
      ).toMatchInlineSnapshot(`
        "type User implements I1 & I2 {
          f1: String
          f2: Int
          f3: User
          f4(f: Filter): Int
        }

        scalar String"
      `);
    });
  });
});
