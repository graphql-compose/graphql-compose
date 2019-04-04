/* @flow strict */

import {
  GraphQLString,
  GraphQLFloat,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLID,
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLEnumType,
  GraphQLScalarType,
  GraphQLInterfaceType,
} from '../graphql';
import { schemaComposer as sc } from '..';
import { graphqlVersion } from '../utils/graphqlVersion';
import GraphQLJSON from '../type/json';
import GraphQLDate from '../type/date';
import GraphQLBuffer from '../type/buffer';
import { ObjectTypeComposer } from '../ObjectTypeComposer';
import { InputTypeComposer } from '../InputTypeComposer';
import { ScalarTypeComposer } from '../ScalarTypeComposer';
import { EnumTypeComposer } from '../EnumTypeComposer';
import { InterfaceTypeComposer } from '../InterfaceTypeComposer';
import { UnionTypeComposer } from '../UnionTypeComposer';
import { Resolver } from '../Resolver';
import { TypeMapper } from '../TypeMapper';

let typeMapper;
beforeEach(() => {
  sc.clear();
  typeMapper = new TypeMapper(sc);
});

describe('TypeMapper', () => {
  it('should have has/get/set methods', () => {
    typeMapper.set('test', GraphQLString);
    expect(typeMapper.has('test')).toBe(true);
    expect(typeMapper.get('test')).toBe(GraphQLString);
    expect(typeMapper.has('test')).toBe(true);
  });

  it('should add basic scalar GraphQL types', () => {
    expect(typeMapper.get('String')).toBe(GraphQLString);
    expect(typeMapper.get('Float')).toBe(GraphQLFloat);
    expect(typeMapper.get('Int')).toBe(GraphQLInt);
    expect(typeMapper.get('Boolean')).toBe(GraphQLBoolean);
    expect(typeMapper.get('ID')).toBe(GraphQLID);
  });

  it('should add basic graphql-compose types', () => {
    expect(typeMapper.get('JSON')).toBe(GraphQLJSON);
    expect(typeMapper.get('Json')).toBe(GraphQLJSON);
    expect(typeMapper.get('Date')).toBe(GraphQLDate);
    expect(typeMapper.get('Buffer')).toBe(GraphQLBuffer);
  });

  it('should allow to override basic graphql-compose types', () => {
    const CustomJSON = new GraphQLScalarType({
      name: 'CustomJSON',
      serialize: () => {},
    });
    const CustomDate = new GraphQLScalarType({
      name: 'CustomDate',
      serialize: () => {},
    });
    const CustomBuffer = new GraphQLScalarType({
      name: 'CustomBuffer',
      serialize: () => {},
    });
    sc.set('JSON', CustomJSON);
    sc.set('Json', CustomJSON);
    sc.set('Date', CustomDate);
    sc.set('Buffer', CustomBuffer);
    expect(typeMapper.get('JSON')).toBe(CustomJSON);
    expect(typeMapper.get('Json')).toBe(CustomJSON);
    expect(typeMapper.get('Date')).toBe(CustomDate);
    expect(typeMapper.get('Buffer')).toBe(CustomBuffer);
  });

  it('should create object type from template string', () => {
    const tc = (typeMapper.createType(
      graphqlVersion < 12
        ? `
          type IntRange {
            # Max value
            max: Int,
            min: Int!
            arr: [String]
          }
        `
        : `
          type IntRange {
            """Max value"""
            max: Int,
            min: Int!
            arr: [String]
          }
        `
    ): any);

    const type = tc.getType();
    expect(type).toBeInstanceOf(GraphQLObjectType);
    expect(typeMapper.get('IntRange')).toBe(type);

    const IntRangeTC = new ObjectTypeComposer(type, sc);
    expect(IntRangeTC.getTypeName()).toBe('IntRange');
    expect(IntRangeTC.getFieldNames()).toEqual(expect.arrayContaining(['max', 'min', 'arr']));
    expect(IntRangeTC.getFieldType('max')).toBe(GraphQLInt);
    expect(IntRangeTC.getFieldConfig('max').description).toBe('Max value');
    expect(IntRangeTC.getFieldType('min')).toBeInstanceOf(GraphQLNonNull);
    expect(IntRangeTC.getFieldType('arr')).toBeInstanceOf(GraphQLList);
  });

  it('should create input object type from template string', () => {
    const tc = (typeMapper.createType(
      `
      input InputIntRange {
        min: Int @default(value: 0)
        max: Int!
      }
    `
    ): any);
    const type = tc.getType();

    expect(type).toBeInstanceOf(GraphQLInputObjectType);
    expect(typeMapper.get('InputIntRange')).toBe(type);

    const IntRangeTC: any = new InputTypeComposer(type, sc);
    expect(IntRangeTC.getTypeName()).toBe('InputIntRange');
    expect(IntRangeTC.getField('min').defaultValue).toBe(0);
    expect(IntRangeTC.getField('min').type).toBe('Int');
    expect(IntRangeTC.getField('max').type).toBe('Int!');
  });

  it('should create interface type from template string', () => {
    const tc = (typeMapper.createType(
      graphqlVersion < 12
        ? `
          interface IntRangeInterface {
            # Max value
            max: Int,
            min: Int!
            arr: [String]
          }
        `
        : `
          interface IntRangeInterface {
            """Max value"""
            max: Int,
            min: Int!
            arr: [String]
          }
        `
    ): any);

    const type = tc.getType();

    expect(type).toBeInstanceOf(GraphQLInterfaceType);
    expect(typeMapper.get('IntRangeInterface')).toBe(type);

    const IntRangeTC = new InterfaceTypeComposer(type, sc);
    expect(IntRangeTC.getTypeName()).toBe('IntRangeInterface');
    expect(IntRangeTC.getFieldNames()).toEqual(expect.arrayContaining(['max', 'min', 'arr']));
    expect(IntRangeTC.getFieldType('max')).toBe(GraphQLInt);
    expect(IntRangeTC.getFieldConfig('max').description).toBe('Max value');
    expect(IntRangeTC.getFieldType('min')).toBeInstanceOf(GraphQLNonNull);
    expect(IntRangeTC.getFieldType('arr')).toBeInstanceOf(GraphQLList);
  });

  it('should return wrapped type', () => {
    expect(typeMapper.getWrapped('String!')).toBeInstanceOf(GraphQLNonNull);
    expect(typeMapper.getWrapped('[String]')).toBeInstanceOf(GraphQLList);

    expect(typeMapper.getWrapped('[String]!')).toBeInstanceOf(GraphQLNonNull);
    expect((typeMapper.getWrapped('[String]!'): any).ofType).toBeInstanceOf(GraphQLList);

    expect(typeMapper.getWrapped('String')).toBe(GraphQLString);
  });

  describe('convertOutputFieldConfig()', () => {
    describe('converting field type', () => {
      it('should accept type with GraphQLOutputType', () => {
        const fc = typeMapper.convertOutputFieldConfig({
          type: GraphQLString,
        });
        expect(fc.type).toBe(GraphQLString);

        const objectType = new GraphQLObjectType({
          name: 'SomeType',
          fields: { f: { type: GraphQLString } },
        });
        const fc2 = typeMapper.convertOutputFieldConfig({
          type: objectType,
        });
        expect(fc2.type).toBe(objectType);
      });

      it('should accept GraphQLScalarType', () => {
        const fc = typeMapper.convertOutputFieldConfig(GraphQLString);
        expect(fc.type).toBe(GraphQLString);
      });

      it('should accept GraphQLObjectType', () => {
        const type = new GraphQLObjectType({
          name: 'Test',
          fields: () => ({
            a: { type: GraphQLInt },
          }),
        });
        const fc = typeMapper.convertOutputFieldConfig(type);
        expect(fc.type).toBe(type);
      });

      it('should accept GraphQLNonNull', () => {
        const fc: any = typeMapper.convertOutputFieldConfig(new GraphQLNonNull(GraphQLString));
        expect(fc.type).toBeInstanceOf(GraphQLNonNull);
        expect(fc.type.ofType).toBe(GraphQLString);
      });

      it('should accept GraphQLList', () => {
        const fc: any = typeMapper.convertOutputFieldConfig(new GraphQLList(GraphQLString));
        expect(fc.type).toBeInstanceOf(GraphQLList);
        expect(fc.type.ofType).toBe(GraphQLString);
      });

      it('should accept type as string', () => {
        const fc = typeMapper.convertOutputFieldConfig({
          type: 'String',
        });
        expect(fc.type).toBe(GraphQLString);
      });

      it('should create field config from type as string', () => {
        const fc = typeMapper.convertOutputFieldConfig('String');
        expect(fc.type).toBe(GraphQLString);
      });

      it('should lookup type name as string in schemaComposer', () => {
        const tc = ObjectTypeComposer.create(`type MyType { a: Int }`, sc);
        const fc = typeMapper.convertOutputFieldConfig('MyType');
        expect(fc.type).toBe(tc.getType());

        const fc2: any = typeMapper.convertOutputFieldConfig({ type: '[MyType]' });
        expect(fc2.type.ofType).toBe(tc.getType());
      });

      it('should create field config from GraphQL Schema Language', () => {
        const fc = typeMapper.convertOutputFieldConfig(
          `type MyOutputType {
          a: String,
          b: Int,
        }`
        );
        const tc = new ObjectTypeComposer((fc.type: any), sc);
        expect(tc.getTypeName()).toBe('MyOutputType');
        expect(tc.getFieldType('a')).toBe(GraphQLString);
        expect(tc.getFieldType('b')).toBe(GraphQLInt);
      });

      it('should create field with Scalar type from GraphQL Schema Language', () => {
        const fc: any = typeMapper.convertOutputFieldConfig('scalar MyScalar');
        expect(fc.type).toBeInstanceOf(GraphQLScalarType);
        expect(fc.type.name).toBe('MyScalar');
      });

      it('should create field with Enum type from GraphQL Schema Language', () => {
        const fc: any = typeMapper.convertOutputFieldConfig('enum MyEnum { AND OR }');
        expect(fc.type).toBeInstanceOf(GraphQLEnumType);
        const enumValues = fc.type.getValues();
        expect(enumValues[0].name).toBe('AND');
        expect(enumValues[0].value).toBe('AND');
        expect(enumValues[1].name).toBe('OR');
        expect(enumValues[1].value).toBe('OR');
      });

      it('should throw error if provided input type definition', () => {
        expect(() => {
          typeMapper.convertOutputFieldConfig(
            `input MyInputType {
            a: String,
          }`
          );
        }).toThrowError(/should be OutputType, but got following type definition/);
      });

      it('should accept ObjectTypeComposer', () => {
        const tc = ObjectTypeComposer.create('type PriceRange { lon: Float, lat: Float }', sc);
        tc.setDescription('Description');
        const fc = typeMapper.convertOutputFieldConfig({
          type: tc,
        });
        expect(fc.type).toBe(tc.getType());
        expect(fc.description).toBe(undefined);

        const fc2 = typeMapper.convertOutputFieldConfig(tc);
        expect(fc2.type).toBe(tc.getType());
        expect(fc2.description).toBe('Description');
      });

      it('should accept ScalarTypeComposer', () => {
        const stc = ScalarTypeComposer.create('scalar UInt', sc);
        stc.setDescription('Description');
        const fc = typeMapper.convertOutputFieldConfig({
          type: stc,
        });
        expect(fc.type).toBe(stc.getType());
        expect(fc.description).toBe(undefined);

        const fc2 = typeMapper.convertOutputFieldConfig(stc);
        expect(fc2.type).toBe(stc.getType());
        expect(fc2.description).toBe('Description');
      });

      it('should accept EnumTypeComposer', () => {
        const etc = EnumTypeComposer.create('enum MyEnum { V1 V2 V3 }', sc);
        etc.setDescription('Description');
        const fc = typeMapper.convertOutputFieldConfig({
          type: etc,
        });
        expect(fc.type).toBe(etc.getType());
        expect(fc.description).toBe(undefined);

        const fc2 = typeMapper.convertOutputFieldConfig(etc);
        expect(fc2.type).toBe(etc.getType());
        expect(fc2.description).toBe('Description');
      });

      it('should accept InterfaceTypeComposer', () => {
        const iftc = InterfaceTypeComposer.create('interface MyIFace { id: Int }', sc);
        iftc.setDescription('Description');
        const fc = typeMapper.convertOutputFieldConfig({
          type: iftc,
        });
        expect(fc.type).toBe(iftc.getType());
        expect(fc.description).toBe(undefined);

        const fc2 = typeMapper.convertOutputFieldConfig(iftc);
        expect(fc2.type).toBe(iftc.getType());
        expect(fc2.description).toBe('Description');
      });

      it('should accept Resolver', () => {
        const resolver = new Resolver(
          {
            name: 'find',
            type: 'Float',
            args: {
              a1: 'String',
            },
            resolve: () => 123,
          },
          sc
        );
        const fc: any = typeMapper.convertOutputFieldConfig(resolver);
        expect(fc.type).toBe(GraphQLFloat);
        expect(fc.args.a1.type).toBe(GraphQLString);
        expect(fc.resolve()).toBe(123);
      });

      it('should accept Resolver as type', () => {
        const resolver = new Resolver(
          {
            name: 'find',
            type: 'Float',
            args: {
              a1: 'String',
            },
            resolve: () => 123,
          },
          sc
        );
        const fc = typeMapper.convertOutputFieldConfig({ type: resolver });
        expect(fc.type).toBe(GraphQLFloat);
        expect(fc.args).toBe(undefined);
        expect(fc.resolve).toBe(undefined);
      });

      it('should pass unchanged thunk', () => {
        const myTypeThunk = () => 'Int';
        const fc = typeMapper.convertOutputFieldConfig(myTypeThunk);
        expect(fc).toBe(myTypeThunk);
      });

      it('should accept array with one element as type and wrap them with GraphQLList', () => {
        const fc: any = typeMapper.convertOutputFieldConfig(['String']);
        expect(fc.type).toBeInstanceOf(GraphQLList);
        expect(fc.type.ofType).toBe(GraphQLString);

        const fc2: any = typeMapper.convertOutputFieldConfig({ type: ['String'] });
        expect(fc2.type).toBeInstanceOf(GraphQLList);
        expect(fc2.type.ofType).toBe(GraphQLString);

        const fc3: any = typeMapper.convertOutputFieldConfig({
          type: [GraphQLString],
        });
        expect(fc3.type).toBeInstanceOf(GraphQLList);
        expect(fc3.type.ofType).toBe(GraphQLString);

        const tc = ObjectTypeComposer.create('type PriceRange { lon: Float, lat: Float }', sc);

        const fc4: any = typeMapper.convertOutputFieldConfig([tc]);
        expect(fc4.type).toBeInstanceOf(GraphQLList);
        expect(fc4.type.ofType).toBe(tc.getType());

        const fc5: any = typeMapper.convertOutputFieldConfig({ type: [tc] });
        expect(fc5.type).toBeInstanceOf(GraphQLList);
        expect(fc5.type.ofType).toBe(tc.getType());

        expect(() => {
          typeMapper.convertOutputFieldConfig([]);
        }).toThrowError(/can accept Array exact with one output type/);

        const fc6: any = typeMapper.convertOutputFieldConfig([['String']]);
        expect(fc6.type).toBeInstanceOf(GraphQLList);
        expect(fc6.type.ofType).toBeInstanceOf(GraphQLList);
        expect(fc6.type.ofType.ofType).toBe(GraphQLString);
      });

      it('should throw error if provided InputTypeComposer', () => {
        const itc = InputTypeComposer.create('input LonLatInput { lon: Float, lat: Float }', sc);

        expect(() => {
          typeMapper.convertOutputFieldConfig(({ type: itc }: any));
        }).toThrowError(/InputTypeComposer/);

        expect(() => {
          typeMapper.convertOutputFieldConfig((itc: any));
        }).toThrowError(/InputTypeComposer/);
      });
    });

    it('should convert args types', () => {
      const fc: any = typeMapper.convertOutputFieldConfig({
        type: 'String',
        args: {
          a1: { type: 'String' },
          a2: 'Int',
        },
      });
      expect(fc.args.a1.type).toBe(GraphQLString);
      expect(fc.args.a2.type).toBe(GraphQLInt);
    });

    it('should process outputFieldConfigMap()', () => {
      const fcm = typeMapper.convertOutputFieldConfigMap({
        f1: 'String',
        f2: 'Int',
      });
      expect(fcm.f1.type).toBe(GraphQLString);
      expect(fcm.f2.type).toBe(GraphQLInt);
    });
  });

  describe('convertInputFieldConfig()', () => {
    it('should accept type with GraphQLInputObjectType', () => {
      const ic = typeMapper.convertInputFieldConfig({
        type: GraphQLString,
      });
      expect(ic.type).toBe(GraphQLString);

      const objectType = new GraphQLInputObjectType({
        name: 'SomeTypeInput',
        fields: { f: { type: GraphQLString } },
      });
      const ic2 = typeMapper.convertInputFieldConfig({
        type: objectType,
      });
      expect(ic2.type).toBe(objectType);
    });

    it('should accept GraphQLScalarType', () => {
      const ic = typeMapper.convertInputFieldConfig(GraphQLString);
      expect(ic.type).toBe(GraphQLString);
    });

    it('should accept GraphQLInputObjectType', () => {
      const type = new GraphQLInputObjectType({
        name: 'InputType',
        fields: () => ({ f1: { type: GraphQLInt } }),
      });
      const ic = typeMapper.convertInputFieldConfig(type);
      expect(ic.type).toBe(type);
    });

    it('should accept GraphQLNonNull', () => {
      const ic: any = typeMapper.convertInputFieldConfig(new GraphQLNonNull(GraphQLString));
      expect(ic.type).toBeInstanceOf(GraphQLNonNull);
      expect(ic.type.ofType).toBe(GraphQLString);
    });

    it('should accept GraphQLList', () => {
      const ic: any = typeMapper.convertInputFieldConfig(new GraphQLList(GraphQLString));
      expect(ic.type).toBeInstanceOf(GraphQLList);
      expect(ic.type.ofType).toBe(GraphQLString);
    });

    it('should accept type name as string', () => {
      const ic = typeMapper.convertInputFieldConfig({
        type: 'String',
      });
      expect(ic.type).toBe(GraphQLString);
    });

    it('should create field config from type name as string', () => {
      const ic = typeMapper.convertInputFieldConfig('String');
      expect(ic.type).toBe(GraphQLString);
    });

    it('should lookup type name as string in schemaComposer', () => {
      const itc = InputTypeComposer.create(`input MyInput { a: Int }`, sc);
      const ic = typeMapper.convertInputFieldConfig('MyInput');
      expect(ic.type).toBe(itc.getType());
    });

    it('should create field config from input type GraphQL Schema Language', () => {
      const fc: any = typeMapper.convertInputFieldConfig(
        `input MyInputType {
          a: String,
          b: Int,
        }`
      );
      const itc = new InputTypeComposer(fc.type, sc);
      expect(itc.getTypeName()).toBe('MyInputType');
      expect(itc.getFieldType('a')).toBe(GraphQLString);
      expect(itc.getFieldType('b')).toBe(GraphQLInt);
    });

    it('should create field with Scalar type from GraphQL Schema Language', () => {
      const fc: any = typeMapper.convertInputFieldConfig('scalar MyInput');
      expect(fc.type).toBeInstanceOf(GraphQLScalarType);
      expect(fc.type.name).toBe('MyInput');
    });

    it('should create field with Enum type from GraphQL Schema Language', () => {
      const fc: any = typeMapper.convertInputFieldConfig('enum MyInputEnum { AND OR }');
      expect(fc.type).toBeInstanceOf(GraphQLEnumType);
      const enumValues = fc.type.getValues();
      expect(enumValues[0].name).toBe('AND');
      expect(enumValues[0].value).toBe('AND');
      expect(enumValues[1].name).toBe('OR');
      expect(enumValues[1].value).toBe('OR');
    });

    it('should throw error if provided output type definition', () => {
      expect(() => {
        typeMapper.convertInputFieldConfig(
          `type MyOutputType {
          a: String,
        }`
        );
      }).toThrowError(/should be InputType, but got output type definition/);
    });

    it('should accept InputTypeComposer', () => {
      const itc = InputTypeComposer.create('input PriceRangeInput { lon: Float, lat: Float }', sc);
      itc.setDescription('Description');
      const ic = typeMapper.convertInputFieldConfig({
        type: itc,
      });
      expect(ic.type).toBe(itc.getType());
      expect(ic.description).toBe(undefined);

      const ic2 = typeMapper.convertInputFieldConfig(itc);
      expect(ic2.type).toBe(itc.getType());
      expect(ic2.description).toBe('Description');
    });

    it('should accept ScalarTypeComposer', () => {
      const stc = ScalarTypeComposer.create('scalar MySca', sc);
      stc.setDescription('Description');
      const ic = typeMapper.convertInputFieldConfig({
        type: stc,
      });
      expect(ic.type).toBe(stc.getType());
      expect(ic.description).toBe(undefined);

      const ic2 = typeMapper.convertInputFieldConfig(stc);
      expect(ic2.type).toBe(stc.getType());
      expect(ic2.description).toBe('Description');
    });

    it('should accept EnumTypeComposer', () => {
      const etc = EnumTypeComposer.create('enum MyEnum { V1 V2 }', sc);
      etc.setDescription('Description');
      const ic = typeMapper.convertInputFieldConfig({
        type: etc,
      });
      expect(ic.type).toBe(etc.getType());
      expect(ic.description).toBe(undefined);

      const ic2 = typeMapper.convertInputFieldConfig(etc);
      expect(ic2.type).toBe(etc.getType());
      expect(ic2.description).toBe('Description');
    });

    it('should throw error if provided ObjectTypeComposer', () => {
      const tc = ObjectTypeComposer.create('type LonLat { lon: Float, lat: Float }', sc);

      expect(() => {
        typeMapper.convertInputFieldConfig({
          type: (tc: any),
        });
      }).toThrowError(/\sObjectTypeComposer/);

      expect(() => {
        typeMapper.convertInputFieldConfig((tc: any));
      }).toThrowError(/\sObjectTypeComposer/);
    });

    it('should pass unchanged thunk', () => {
      const myTypeThunk = () => 'Int';
      const tc = typeMapper.convertInputFieldConfig(myTypeThunk);
      expect(tc).toBe(myTypeThunk);
    });

    it('should accept array with one element as type and wrap them with GraphQLList', () => {
      const fc: any = typeMapper.convertInputFieldConfig(['String']);
      expect(fc.type).toBeInstanceOf(GraphQLList);
      expect(fc.type.ofType).toBe(GraphQLString);

      const fc2: any = typeMapper.convertInputFieldConfig({ type: ['String'] });
      expect(fc2.type).toBeInstanceOf(GraphQLList);
      expect(fc2.type.ofType).toBe(GraphQLString);

      const fc3: any = typeMapper.convertInputFieldConfig({
        type: [GraphQLString],
      });
      expect(fc3.type).toBeInstanceOf(GraphQLList);
      expect(fc3.type.ofType).toBe(GraphQLString);

      const itc = InputTypeComposer.create('input PriceRangeInput { lon: Float, lat: Float }', sc);

      const fc4: any = typeMapper.convertInputFieldConfig([itc]);
      expect(fc4.type).toBeInstanceOf(GraphQLList);
      expect(fc4.type.ofType).toBe(itc.getType());

      const fc5: any = typeMapper.convertInputFieldConfig({ type: [itc] });
      expect(fc5.type).toBeInstanceOf(GraphQLList);
      expect(fc5.type.ofType).toBe(itc.getType());

      const fc6: any = typeMapper.convertInputFieldConfig([['String']]);
      expect(fc6.type).toBeInstanceOf(GraphQLList);
      expect(fc6.type.ofType).toBeInstanceOf(GraphQLList);
      expect(fc6.type.ofType.ofType).toBe(GraphQLString);

      expect(() => {
        typeMapper.convertInputFieldConfig([]);
      }).toThrowError(/can accept Array exact with one input type/);
    });

    it('should process inputFieldConfigMap()', () => {
      const icm = typeMapper.convertInputFieldConfigMap({
        i1: { type: 'String' },
        i2: 'Int',
      });
      expect(icm.i1.type).toBe(GraphQLString);
      expect(icm.i2.type).toBe(GraphQLInt);
    });
  });

  describe('convertArgConfig()', () => {
    it('should accept type with GraphQLInputObjectType', () => {
      const ac = typeMapper.convertArgConfig({
        type: GraphQLString,
      });
      expect(ac.type).toBe(GraphQLString);

      const objectType = new GraphQLInputObjectType({
        name: 'SomeTypeInput',
        fields: { f: { type: GraphQLString } },
      });
      const ac2 = typeMapper.convertArgConfig({
        type: objectType,
      });
      expect(ac2.type).toBe(objectType);
    });

    it('should accept GraphQLScalarType', () => {
      const ac = typeMapper.convertArgConfig(GraphQLString);
      expect(ac.type).toBe(GraphQLString);
    });

    it('should accept GraphQLInputObjectType', () => {
      const type = new GraphQLInputObjectType({
        name: 'InputType',
        fields: () => ({ f: { type: GraphQLInt } }),
      });
      const ac = typeMapper.convertArgConfig(type);
      expect(ac.type).toBe(type);
    });

    it('should accept GraphQLNonNull', () => {
      const ac: any = typeMapper.convertArgConfig(new GraphQLNonNull(GraphQLString));
      expect(ac.type).toBeInstanceOf(GraphQLNonNull);
      expect(ac.type.ofType).toBe(GraphQLString);
    });

    it('should accept GraphQLList', () => {
      const ac: any = typeMapper.convertArgConfig(new GraphQLList(GraphQLString));
      expect(ac.type).toBeInstanceOf(GraphQLList);
      expect(ac.type.ofType).toBe(GraphQLString);
    });

    it('should accept type name as string', () => {
      const ac = typeMapper.convertArgConfig({
        type: 'String',
      });
      expect(ac.type).toBe(GraphQLString);
    });

    it('should create arg config from GraphQL Schema Language', () => {
      const ac = typeMapper.convertArgConfig('String');
      expect(ac.type).toBe(GraphQLString);
    });

    it('should lookup type name as string in schemaComposer', () => {
      const itc = InputTypeComposer.create(`input MyArg { a: Int }`, sc);
      const ac = typeMapper.convertArgConfig('MyArg');
      expect(ac.type).toBe(itc.getType());
    });

    it('should create arg config from input type GraphQL Schema Language', () => {
      const fc: any = typeMapper.convertArgConfig(
        `input MyInputArg {
        a: String,
        b: Int,
      }`
      );
      const itc = new InputTypeComposer(fc.type, sc);
      expect(itc.getTypeName()).toBe('MyInputArg');
      expect(itc.getFieldType('a')).toBe(GraphQLString);
      expect(itc.getFieldType('b')).toBe(GraphQLInt);
    });

    it('should create arg config with Scalar type from GraphQL Schema Language', () => {
      const fc: any = typeMapper.convertArgConfig('scalar Abc');
      expect(fc.type).toBeInstanceOf(GraphQLScalarType);
      expect(fc.type.name).toBe('Abc');
    });

    it('should create arg config with Enum type from GraphQL Schema Language', () => {
      const fc: any = typeMapper.convertArgConfig('enum MyArgEnum { AND OR }');
      expect(fc.type).toBeInstanceOf(GraphQLEnumType);
      const enumValues = fc.type.getValues();
      expect(enumValues[0].name).toBe('AND');
      expect(enumValues[0].value).toBe('AND');
      expect(enumValues[1].name).toBe('OR');
      expect(enumValues[1].value).toBe('OR');
    });

    it('should throw error if provided output type definition', () => {
      expect(() => {
        typeMapper.convertArgConfig(
          `type MyOutputType {
          a: String,
        }`
        );
      }).toThrowError(/should be InputType, but got output type definition/);
    });

    it('should accept InputTypeComposer', () => {
      const itc = InputTypeComposer.create('input PriceRangeInput { lon: Float, lat: Float }', sc);
      itc.setDescription('Description');
      const ac = typeMapper.convertArgConfig({
        type: itc,
      });
      expect(ac.type).toBe(itc.getType());
      expect(ac.description).toBe(undefined);

      const ac2 = typeMapper.convertArgConfig(itc);
      expect(ac2.type).toBe(itc.getType());
      expect(ac2.description).toBe('Description');
    });

    it('should accept ScalarTypeComposer', () => {
      const stc = ScalarTypeComposer.create('scalar Aaa', sc);
      stc.setDescription('Description');
      const ac = typeMapper.convertArgConfig({
        type: stc,
      });
      expect(ac.type).toBe(stc.getType());
      expect(ac.description).toBe(undefined);

      const ac2 = typeMapper.convertArgConfig(stc);
      expect(ac2.type).toBe(stc.getType());
      expect(ac2.description).toBe('Description');
    });

    it('should accept EnumTypeComposer', () => {
      const etc = EnumTypeComposer.create('enum MyEnum { V1 V2 }', sc);
      etc.setDescription('Description');
      const ac = typeMapper.convertArgConfig({
        type: etc,
      });
      expect(ac.type).toBe(etc.getType());
      expect(ac.description).toBe(undefined);

      const ac2 = typeMapper.convertArgConfig(etc);
      expect(ac2.type).toBe(etc.getType());
      expect(ac2.description).toBe('Description');
    });

    it('should pass unchanged thunk', () => {
      const myTypeThunk = () => 'Int';
      const ac = typeMapper.convertArgConfig(myTypeThunk);
      expect(ac).toBe(myTypeThunk);
    });

    it('should accept array with one element as type and wrap them with GraphQLList', () => {
      const fc: any = typeMapper.convertArgConfig(['String']);
      expect(fc.type).toBeInstanceOf(GraphQLList);
      expect(fc.type.ofType).toBe(GraphQLString);

      const fc2: any = typeMapper.convertArgConfig({ type: ['String'] });
      expect(fc2.type).toBeInstanceOf(GraphQLList);
      expect(fc2.type.ofType).toBe(GraphQLString);

      const fc3: any = typeMapper.convertArgConfig({ type: [GraphQLString] });
      expect(fc3.type).toBeInstanceOf(GraphQLList);
      expect(fc3.type.ofType).toBe(GraphQLString);

      const itc = InputTypeComposer.create('input PriceRangeInput { lon: Float, lat: Float }', sc);

      const fc4: any = typeMapper.convertArgConfig([itc]);
      expect(fc4.type).toBeInstanceOf(GraphQLList);
      expect(fc4.type.ofType).toBe(itc.getType());

      const fc5: any = typeMapper.convertArgConfig({ type: [itc] });
      expect(fc5.type).toBeInstanceOf(GraphQLList);
      expect(fc5.type.ofType).toBe(itc.getType());

      const fc6: any = typeMapper.convertArgConfig([['String']]);
      expect(fc6.type).toBeInstanceOf(GraphQLList);
      expect(fc6.type.ofType).toBeInstanceOf(GraphQLList);
      expect(fc6.type.ofType.ofType).toBe(GraphQLString);

      expect(() => {
        typeMapper.convertArgConfig([]);
      }).toThrowError(/can accept Array exact with one input type/);
    });

    it('should throw error if provided ObjectTypeComposer', () => {
      const tc = ObjectTypeComposer.create('type LonLat { lon: Float, lat: Float }', sc);

      expect(() => {
        typeMapper.convertArgConfig(({ type: tc }: any));
      }).toThrowError(/\sObjectTypeComposer/);

      expect(() => {
        typeMapper.convertArgConfig((tc: any));
      }).toThrowError(/\sObjectTypeComposer/);
    });

    it('should process ArgConfigMap', () => {
      const acm = typeMapper.convertArgConfigMap({
        a1: { type: 'String' },
        a2: 'Int',
      });
      expect(acm.a1.type).toBe(GraphQLString);
      expect(acm.a2.type).toBe(GraphQLInt);
    });
  });

  describe('parseTypesFrom... methods', () => {
    it('parseTypesFromString()', () => {
      const gql = `
        type User {
          name: String
        }

        type Article {
          title: String
        }

        input Record {
          id: ID
          ts: Int
        }
      `;

      const ts = typeMapper.parseTypesFromString(gql);
      expect(Array.from(ts.keys())).toEqual(['User', 'Article', 'Record']);

      expect(ts.get('User').getType()).toBeInstanceOf(GraphQLObjectType);
      expect(ts.get('Article').getType()).toBeInstanceOf(GraphQLObjectType);
      expect(ts.get('Record').getType()).toBeInstanceOf(GraphQLInputObjectType);
    });

    it('parseTypesFromString() should strictly accept `schema` definition', () => {
      const ts = typeMapper.parseTypesFromString(`
        schema {
          query: Query
          mutation: Mutation
          subscription: Subscription
        }
      `);
      expect(ts.size).toEqual(0);

      expect(() => {
        typeMapper.parseTypesFromString(`schema { query: ErrName }`);
      }).toThrow("Incorrect type name 'ErrName' for 'query'");

      expect(() => {
        typeMapper.parseTypesFromString(`schema { mutation: ErrName }`);
      }).toThrow("Incorrect type name 'ErrName' for 'mutation'");

      expect(() => {
        typeMapper.parseTypesFromString(`schema { subscription: ErrName }`);
      }).toThrow("Incorrect type name 'ErrName' for 'subscription'");
    });

    it('parseTypesFromString() should strictly accept `scalar` definition', () => {
      const ts = typeMapper.parseTypesFromString(`scalar MyScalar`);
      expect(ts.get('MyScalar').getType()).toBeInstanceOf(GraphQLScalarType);
    });

    it('parseTypesFromString() should accept `union` definition', () => {
      const ts = typeMapper.parseTypesFromString(`
        union TypeAB = TypeA | TypeB
        type TypeA { f1: Int }
        type TypeB { f2: Int }
      `);

      const TypeAB = (ts.get('TypeAB'): any);
      expect(TypeAB).toBeInstanceOf(UnionTypeComposer);

      const types = TypeAB.getTypes();
      expect(types).toHaveLength(2);
    });
  });

  describe('createType()', () => {
    it('should return same type for the same TypeDefinitionString', () => {
      const t1: any = typeMapper.createType('type SameType { a: Int }');
      const t2: any = typeMapper.createType('type SameType { a: Int }');
      expect(t1).toBe(t2);
      expect(t1.getTypeName()).toBe('SameType');
      expect(t1.getFieldType('a')).toBe(GraphQLInt);
    });
  });
});
