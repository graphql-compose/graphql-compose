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
import { schemaComposer, SchemaComposer } from '..';
import { Resolver } from '../Resolver';
import { ObjectTypeComposer } from '../ObjectTypeComposer';
import { InputTypeComposer } from '../InputTypeComposer';
import { InterfaceTypeComposer } from '../InterfaceTypeComposer';
import { ScalarTypeComposer } from '../ScalarTypeComposer';
import { EnumTypeComposer } from '../EnumTypeComposer';
import { UnionTypeComposer } from '../UnionTypeComposer';
import { graphqlVersion } from '../utils/graphqlVersion';

beforeEach(() => {
  schemaComposer.clear();
});

describe('ObjectTypeComposer', () => {
  let objectType: GraphQLObjectType;
  let tc: ObjectTypeComposer<any, any>;

  beforeEach(() => {
    objectType = new GraphQLObjectType({
      name: 'Readable',
      fields: {
        field1: { type: GraphQLString },
        field2: { type: GraphQLString },
      },
    });
    tc = new ObjectTypeComposer(objectType, schemaComposer);
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
        const fields = objectType.getFields();
        expect(Object.keys(fields)).toContain('field3');
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
        expect((tc.getField('input3'): any).type).toBe(typeAsFn);
        expect(tc.getFieldType('input3')).toBe(GraphQLString);

        // show provide unwrapped/unhoisted type for graphql
        if (graphqlVersion >= 14) {
          expect((tc.getType(): any)._fields().input3.type).toBe(GraphQLString);
        } else {
          expect((tc.getType(): any)._typeConfig.fields().input3.type).toBe(GraphQLString);
        }
      });

      it('accept fieldConfig as function', () => {
        tc.setFields({
          input4: () => ({ type: 'String' }),
        });
        // show provide unwrapped/unhoisted type for graphql
        if (graphqlVersion >= 14) {
          expect((tc.getType(): any)._fields().input4.type).toBe(GraphQLString);
        } else {
          expect((tc.getType(): any)._typeConfig.fields().input4.type).toBe(GraphQLString);
        }
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
        expect(args.arg1).toBe('Int');
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
        expect(() => tc.getFieldArg('field1', 'arg222')).toThrow(
          /Cannot get arg.*Argument does not exist/
        );
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
        // $FlowFixMe
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

      // should unwrap with GraphQLNonNull
      tc.makeFieldNullable('fieldNN');
      expect(tc.getFieldType('fieldNN')).toBe(GraphQLString);

      // should work for already unwrapped type
      tc.makeFieldNullable('fieldNN');
      expect(tc.getFieldType('fieldNN')).toBe(GraphQLString);
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
      if (graphqlVersion >= 14) {
        tc.gqType._interfaces = [iface];
      } else {
        (tc.gqType: any)._typeConfig.interfaces = [iface];
      }
      expect(tc.getInterfaces()).toEqual(expect.arrayContaining([iface]));
    });

    it('hasInterface()', () => {
      if (graphqlVersion >= 14) {
        tc.gqType._interfaces = [iface];
      } else {
        (tc.gqType: any)._typeConfig.interfaces = [iface];
      }
      expect(tc.hasInterface(iface)).toBe(true);
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
      expect(tc.getInterfaces()).toEqual(expect.arrayContaining([iface]));
      expect(tc.hasInterface(iface)).toBe(true);
      tc.addInterface(iface2);
      expect(tc.getInterfaces()).toEqual(expect.arrayContaining([iface, iface2]));
      expect(tc.hasInterface(iface2)).toBe(true);
      tc.addInterface(iftc);
      expect(tc.hasInterface(iftc)).toBe(true);
    });

    it('removeInterface()', () => {
      tc.addInterface(iface);
      tc.addInterface(iface2);
      tc.addInterface(iftc);
      expect(tc.getInterfaces()).toEqual(expect.arrayContaining([iface, iface2, iftc]));
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
      expect(myTC.getField('f1')).toEqual({ type: 'Type1' });
      expect(myTC.getField('f2')).toEqual({ type: 'Type2!' });
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
    it('should clone projection for fields', () => {
      tc.setField('field3', {
        type: GraphQLString,
        projection: { field1: true, field2: true },
      });

      const tc2 = tc.clone('newObject');
      expect(tc2.getField('field3')).toEqual(
        expect.objectContaining({
          type: GraphQLString,
          projection: { field1: true, field2: true },
        })
      );
    });
  });

  describe('get()', () => {
    it('should return type by path', () => {
      const myTC = new ObjectTypeComposer(
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
      const resolverOpts = {
        name: 'myResolver2',
      };
      tc.addResolver(resolverOpts);
      expect(tc.getResolver('myResolver2')).toBeInstanceOf(Resolver);
      expect(tc.getResolver('myResolver2').name).toBe('myResolver2');
    });

    it('addResolver() should add stub resolve method', () => {
      const resolverOpts = {
        name: 'myResolver3',
      };
      tc.addResolver(resolverOpts);
      expect(tc.getResolver('myResolver3').resolve((undefined: any))).toEqual({});
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
        expect(fc.type.name).toBe('User');
      });

      it('should accept resolver as thunk and return FieldConfig', () => {
        const fc: any = ArticleTC._relationWithResolverToFC({
          resolver: () => UserTC.getResolver('findById'),
        });
        expect(fc.type.name).toBe('User');
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
    it('getTypePlural() should return wrapped type with GraphQLList', () => {
      expect(tc.getTypePlural()).toBeInstanceOf(GraphQLList);
      expect(tc.getTypePlural().ofType).toBe(tc.getType());
    });

    it('getTypeNonNull() should return wrapped type with GraphQLNonNull', () => {
      expect(tc.getTypeNonNull()).toBeInstanceOf(GraphQLNonNull);
      expect(tc.getTypeNonNull().ofType).toBe(tc.getType());
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
          resolve: () => [{ kind: 'A', a: 1 }, { kind: 'B', b: 2 }, { kind: 'C', c: 3 }],
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
      const itc1 = tc.getInputTypeComposer();
      tc.removeInputTypeComposer();
      const itc2 = tc.getInputTypeComposer();
      expect(itc1).not.toBe(itc2);
    });
  });

  describe('directive methods', () => {
    it('type level directive methods', () => {
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
});
