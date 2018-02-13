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
} from '../graphql';
import { GQC, TypeComposer, InputTypeComposer, EnumTypeComposer, Resolver, TypeMapper } from '../';
import { graphqlVersion } from '../utils/graphqlVersion';
import GraphQLJSON from '../type/json';
import GraphQLDate from '../type/date';
import GraphQLBuffer from '../type/buffer';

beforeEach(() => {
  GQC.clear();
});

describe('TypeMapper', () => {
  it('should have has/get/set methods', () => {
    TypeMapper.set('test', GraphQLString);
    expect(TypeMapper.has('test')).toBe(true);
    expect(TypeMapper.get('test')).toBe(GraphQLString);
    expect(TypeMapper.has('test')).toBe(true);
  });

  it('should add basic scalar GraphQL types', () => {
    expect(TypeMapper.get('String')).toBe(GraphQLString);
    expect(TypeMapper.get('Float')).toBe(GraphQLFloat);
    expect(TypeMapper.get('Int')).toBe(GraphQLInt);
    expect(TypeMapper.get('Boolean')).toBe(GraphQLBoolean);
    expect(TypeMapper.get('ID')).toBe(GraphQLID);
  });

  it('should add basic graphql-compose types', () => {
    expect(TypeMapper.get('JSON')).toBe(GraphQLJSON);
    expect(TypeMapper.get('Json')).toBe(GraphQLJSON);
    expect(TypeMapper.get('Date')).toBe(GraphQLDate);
    expect(TypeMapper.get('Buffer')).toBe(GraphQLBuffer);
  });

  it('should create object type from template string', () => {
    const type: GraphQLObjectType = (TypeMapper.createType(
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

    expect(type).toBeInstanceOf(GraphQLObjectType);
    expect(TypeMapper.get('IntRange')).toBe(type);

    const IntRangeTC = new TypeComposer(type);
    expect(IntRangeTC.getTypeName()).toBe('IntRange');
    expect(IntRangeTC.getFieldNames()).toEqual(expect.arrayContaining(['max', 'min', 'arr']));
    expect(IntRangeTC.getField('max').type).toBe(GraphQLInt);
    expect(IntRangeTC.getField('max').description).toBe('Max value');
    expect(IntRangeTC.getField('min').type).toBeInstanceOf(GraphQLNonNull);
    expect(IntRangeTC.getField('arr').type).toBeInstanceOf(GraphQLList);
  });

  it('should create input object type from template string', () => {
    const type: GraphQLInputObjectType = (TypeMapper.createType(
      `
      input InputIntRange {
        max: Int,
        min: Int!
      }
    `
    ): any);

    expect(type).toBeInstanceOf(GraphQLInputObjectType);
    expect(TypeMapper.get('InputIntRange')).toBe(type);

    const IntRangeTC = new InputTypeComposer(type);
    expect(IntRangeTC.getTypeName()).toBe('InputIntRange');
    expect(IntRangeTC.getField('max').type).toBe(GraphQLInt);
    expect(IntRangeTC.getField('min').type).toBeInstanceOf(GraphQLNonNull);
  });

  it('should return wrapped type', () => {
    expect(TypeMapper.getWrapped('String!')).toBeInstanceOf(GraphQLNonNull);
    expect(TypeMapper.getWrapped('[String]')).toBeInstanceOf(GraphQLList);

    expect(TypeMapper.getWrapped('[String]!')).toBeInstanceOf(GraphQLNonNull);
    expect((TypeMapper.getWrapped('[String]!'): any).ofType).toBeInstanceOf(GraphQLList);

    expect(TypeMapper.getWrapped('String')).toBe(GraphQLString);
  });

  describe('convertOutputFieldConfig()', () => {
    describe('converting field type', () => {
      it('should accept type with GraphQLOutputType', () => {
        const fc = TypeMapper.convertOutputFieldConfig({
          type: GraphQLString,
        });
        expect(fc.type).toBe(GraphQLString);

        const objectType = new GraphQLObjectType({
          name: 'SomeType',
          fields: { f: { type: GraphQLString } },
        });
        const fc2 = TypeMapper.convertOutputFieldConfig({
          type: objectType,
        });
        expect(fc2.type).toBe(objectType);
      });

      it('should accept GraphQLScalarType', () => {
        const fc = TypeMapper.convertOutputFieldConfig(GraphQLString);
        expect(fc.type).toBe(GraphQLString);
      });

      it('should accept GraphQLObjectType', () => {
        const type = new GraphQLObjectType({
          name: 'Test',
          fields: () => ({
            a: { type: GraphQLInt },
          }),
        });
        const fc = TypeMapper.convertOutputFieldConfig(type);
        expect(fc.type).toBe(type);
      });

      it('should accept GraphQLNonNull', () => {
        const fc: any = TypeMapper.convertOutputFieldConfig(new GraphQLNonNull(GraphQLString));
        expect(fc.type).toBeInstanceOf(GraphQLNonNull);
        expect(fc.type.ofType).toBe(GraphQLString);
      });

      it('should accept GraphQLList', () => {
        const fc: any = TypeMapper.convertOutputFieldConfig(new GraphQLList(GraphQLString));
        expect(fc.type).toBeInstanceOf(GraphQLList);
        expect(fc.type.ofType).toBe(GraphQLString);
      });

      it('should accept type as string', () => {
        const fc = TypeMapper.convertOutputFieldConfig({
          type: 'String',
        });
        expect(fc.type).toBe(GraphQLString);
      });

      it('should create field config from type as string', () => {
        const fc = TypeMapper.convertOutputFieldConfig('String');
        expect(fc.type).toBe(GraphQLString);
      });

      it('should lookup type name as string in GQC', () => {
        const tc = TypeComposer.create(`type MyType { a: Int }`);
        GQC.add(tc);

        const fc = TypeMapper.convertOutputFieldConfig('MyType');
        expect(fc.type).toBe(tc.getType());
      });

      it('should create field config from GraphQL Schema Language', () => {
        const fc = TypeMapper.convertOutputFieldConfig(
          `type MyOutputType {
          a: String,
          b: Int,
        }`
        );
        const tc = new TypeComposer((fc.type: any));
        expect(tc.getTypeName()).toBe('MyOutputType');
        expect(tc.getFieldType('a')).toBe(GraphQLString);
        expect(tc.getFieldType('b')).toBe(GraphQLInt);
      });

      it('should create field with Enum type from GraphQL Schema Language', () => {
        const fc: any = TypeMapper.convertOutputFieldConfig('enum MyEnum { AND OR }');
        expect(fc.type).toBeInstanceOf(GraphQLEnumType);
        const enumValues = fc.type.getValues();
        expect(enumValues[0].name).toBe('AND');
        expect(enumValues[0].value).toBe('AND');
        expect(enumValues[1].name).toBe('OR');
        expect(enumValues[1].value).toBe('OR');
      });

      it('should throw error if provided input type definition', () => {
        expect(() => {
          TypeMapper.convertOutputFieldConfig(
            `input MyInputType {
            a: String,
          }`
          );
        }).toThrowError(/should be OutputType, but got input type definition/);
      });

      it('should accept TypeComposer', () => {
        const tc = TypeComposer.create('type PriceRange { lon: Float, lat: Float }');
        tc.setDescription('Description');
        const fc = TypeMapper.convertOutputFieldConfig({
          type: tc,
        });
        expect(fc.type).toBe(tc.getType());
        expect(fc.description).toBe(undefined);

        const fc2 = TypeMapper.convertOutputFieldConfig(tc);
        expect(fc2.type).toBe(tc.getType());
        expect(fc2.description).toBe('Description');
      });

      it('should accept EnumTypeComposer', () => {
        const etc = EnumTypeComposer.create('enum MyEnum { V1 V2 V3 }');
        etc.setDescription('Description');
        const fc = TypeMapper.convertOutputFieldConfig({
          type: etc,
        });
        expect(fc.type).toBe(etc.getType());
        expect(fc.description).toBe(undefined);

        const fc2 = TypeMapper.convertOutputFieldConfig(etc);
        expect(fc2.type).toBe(etc.getType());
        expect(fc2.description).toBe('Description');
      });

      it('should accept Resolver', () => {
        const resolver = new Resolver({
          name: 'find',
          type: 'Float',
          args: {
            a1: 'String',
          },
          resolve: () => 123,
        });
        const fc: any = TypeMapper.convertOutputFieldConfig(resolver);
        expect(fc.type).toBe(GraphQLFloat);
        expect(fc.args.a1.type).toBe(GraphQLString);
        expect(fc.resolve()).toBe(123);
      });

      it('should accept Resolver as type', () => {
        const resolver = new Resolver({
          name: 'find',
          type: 'Float',
          args: {
            a1: 'String',
          },
          resolve: () => 123,
        });
        const fc = TypeMapper.convertOutputFieldConfig({ type: resolver });
        expect(fc.type).toBe(GraphQLFloat);
        expect(fc.args).toBe(undefined);
        expect(fc.resolve).toBe(undefined);
      });

      it('should pass unchanged thunk', () => {
        const myTypeThunk = () => 'Int';
        const fc = TypeMapper.convertOutputFieldConfig(myTypeThunk);
        expect(fc).toBe(myTypeThunk);
      });

      it('should accept array with one element as type and wrap them with GraphQLList', () => {
        const fc: any = TypeMapper.convertOutputFieldConfig(['String']);
        expect(fc.type).toBeInstanceOf(GraphQLList);
        expect(fc.type.ofType).toBe(GraphQLString);

        const fc2: any = TypeMapper.convertOutputFieldConfig({ type: ['String'] });
        expect(fc2.type).toBeInstanceOf(GraphQLList);
        expect(fc2.type.ofType).toBe(GraphQLString);

        const fc3: any = TypeMapper.convertOutputFieldConfig({
          type: [GraphQLString],
        });
        expect(fc3.type).toBeInstanceOf(GraphQLList);
        expect(fc3.type.ofType).toBe(GraphQLString);

        const tc = TypeComposer.create('type PriceRange { lon: Float, lat: Float }');

        const fc4: any = TypeMapper.convertOutputFieldConfig([tc]);
        expect(fc4.type).toBeInstanceOf(GraphQLList);
        expect(fc4.type.ofType).toBe(tc.getType());

        const fc5: any = TypeMapper.convertOutputFieldConfig({ type: [tc] });
        expect(fc5.type).toBeInstanceOf(GraphQLList);
        expect(fc5.type.ofType).toBe(tc.getType());

        expect(() => {
          TypeMapper.convertOutputFieldConfig([]);
        }).toThrowError(/can accept Array exact with one output type/);

        const fc6: any = TypeMapper.convertOutputFieldConfig([['String']]);
        expect(fc6.type).toBeInstanceOf(GraphQLList);
        expect(fc6.type.ofType).toBeInstanceOf(GraphQLList);
        expect(fc6.type.ofType.ofType).toBe(GraphQLString);
      });

      it('should throw error if provided InputTypeComposer', () => {
        const itc = InputTypeComposer.create('input LonLatInput { lon: Float, lat: Float }');

        expect(() => {
          TypeMapper.convertOutputFieldConfig(({ type: itc }: any));
        }).toThrowError(/InputTypeComposer/);

        expect(() => {
          TypeMapper.convertOutputFieldConfig((itc: any));
        }).toThrowError(/InputTypeComposer/);
      });
    });

    it('should convert args types', () => {
      const fc: any = TypeMapper.convertOutputFieldConfig({
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
      const fcm = TypeMapper.convertOutputFieldConfigMap({
        f1: 'String',
        f2: 'Int',
      });
      expect(fcm.f1.type).toBe(GraphQLString);
      expect(fcm.f2.type).toBe(GraphQLInt);
    });
  });

  describe('convertInputFieldConfig()', () => {
    it('should accept type with GraphQLInputObjectType', () => {
      const ic = TypeMapper.convertInputFieldConfig({
        type: GraphQLString,
      });
      expect(ic.type).toBe(GraphQLString);

      const objectType = new GraphQLInputObjectType({
        name: 'SomeTypeInput',
        fields: { f: { type: GraphQLString } },
      });
      const ic2 = TypeMapper.convertInputFieldConfig({
        type: objectType,
      });
      expect(ic2.type).toBe(objectType);
    });

    it('should accept GraphQLScalarType', () => {
      const ic = TypeMapper.convertInputFieldConfig(GraphQLString);
      expect(ic.type).toBe(GraphQLString);
    });

    it('should accept GraphQLInputObjectType', () => {
      const type = new GraphQLInputObjectType({
        name: 'InputType',
        fields: () => ({ f1: { type: GraphQLInt } }),
      });
      const ic = TypeMapper.convertInputFieldConfig(type);
      expect(ic.type).toBe(type);
    });

    it('should accept GraphQLNonNull', () => {
      const ic: any = TypeMapper.convertInputFieldConfig(new GraphQLNonNull(GraphQLString));
      expect(ic.type).toBeInstanceOf(GraphQLNonNull);
      expect(ic.type.ofType).toBe(GraphQLString);
    });

    it('should accept GraphQLList', () => {
      const ic: any = TypeMapper.convertInputFieldConfig(new GraphQLList(GraphQLString));
      expect(ic.type).toBeInstanceOf(GraphQLList);
      expect(ic.type.ofType).toBe(GraphQLString);
    });

    it('should accept type name as string', () => {
      const ic = TypeMapper.convertInputFieldConfig({
        type: 'String',
      });
      expect(ic.type).toBe(GraphQLString);
    });

    it('should create field config from type name as string', () => {
      const ic = TypeMapper.convertInputFieldConfig('String');
      expect(ic.type).toBe(GraphQLString);
    });

    it('should lookup type name as string in GQC', () => {
      const itc = InputTypeComposer.create(`input MyInput { a: Int }`);
      GQC.add(itc);

      const ic = TypeMapper.convertInputFieldConfig('MyInput');
      expect(ic.type).toBe(itc.getType());
    });

    it('should create field config from input type GraphQL Schema Language', () => {
      const fc: any = TypeMapper.convertInputFieldConfig(
        `input MyInputType {
          a: String,
          b: Int,
        }`
      );
      const itc = new InputTypeComposer(fc.type);
      expect(itc.getTypeName()).toBe('MyInputType');
      expect(itc.getFieldType('a')).toBe(GraphQLString);
      expect(itc.getFieldType('b')).toBe(GraphQLInt);
    });

    it('should create field with Enum type from GraphQL Schema Language', () => {
      const fc: any = TypeMapper.convertInputFieldConfig('enum MyInputEnum { AND OR }');
      expect(fc.type).toBeInstanceOf(GraphQLEnumType);
      const enumValues = fc.type.getValues();
      expect(enumValues[0].name).toBe('AND');
      expect(enumValues[0].value).toBe('AND');
      expect(enumValues[1].name).toBe('OR');
      expect(enumValues[1].value).toBe('OR');
    });

    it('should throw error if provided output type definition', () => {
      expect(() => {
        TypeMapper.convertInputFieldConfig(
          `type MyOutputType {
          a: String,
        }`
        );
      }).toThrowError(/should be InputType, but got output type definition/);
    });

    it('should accept InputTypeComposer', () => {
      const itc = InputTypeComposer.create('input PriceRangeInput { lon: Float, lat: Float }');
      itc.setDescription('Description');
      const ic = TypeMapper.convertInputFieldConfig({
        type: itc,
      });
      expect(ic.type).toBe(itc.getType());
      expect(ic.description).toBe(undefined);

      const ic2 = TypeMapper.convertInputFieldConfig(itc);
      expect(ic2.type).toBe(itc.getType());
      expect(ic2.description).toBe('Description');
    });

    it('should accept EnumTypeComposer', () => {
      const etc = EnumTypeComposer.create('enum MyEnum { V1 V2 }');
      etc.setDescription('Description');
      const ic = TypeMapper.convertInputFieldConfig({
        type: etc,
      });
      expect(ic.type).toBe(etc.getType());
      expect(ic.description).toBe(undefined);

      const ic2 = TypeMapper.convertInputFieldConfig(etc);
      expect(ic2.type).toBe(etc.getType());
      expect(ic2.description).toBe('Description');
    });

    it('should throw error if provided TypeComposer', () => {
      const tc = TypeComposer.create('type LonLat { lon: Float, lat: Float }');

      expect(() => {
        TypeMapper.convertInputFieldConfig({
          type: (tc: any),
        });
      }).toThrowError(/\sTypeComposer/);

      expect(() => {
        TypeMapper.convertInputFieldConfig((tc: any));
      }).toThrowError(/\sTypeComposer/);
    });

    it('should pass unchanged thunk', () => {
      const myTypeThunk = () => 'Int';
      const tc = TypeMapper.convertInputFieldConfig(myTypeThunk);
      expect(tc).toBe(myTypeThunk);
    });

    it('should accept array with one element as type and wrap them with GraphQLList', () => {
      const fc: any = TypeMapper.convertInputFieldConfig(['String']);
      expect(fc.type).toBeInstanceOf(GraphQLList);
      expect(fc.type.ofType).toBe(GraphQLString);

      const fc2: any = TypeMapper.convertInputFieldConfig({ type: ['String'] });
      expect(fc2.type).toBeInstanceOf(GraphQLList);
      expect(fc2.type.ofType).toBe(GraphQLString);

      const fc3: any = TypeMapper.convertInputFieldConfig({
        type: [GraphQLString],
      });
      expect(fc3.type).toBeInstanceOf(GraphQLList);
      expect(fc3.type.ofType).toBe(GraphQLString);

      const itc = InputTypeComposer.create('input PriceRangeInput { lon: Float, lat: Float }');

      const fc4: any = TypeMapper.convertInputFieldConfig([itc]);
      expect(fc4.type).toBeInstanceOf(GraphQLList);
      expect(fc4.type.ofType).toBe(itc.getType());

      const fc5: any = TypeMapper.convertInputFieldConfig({ type: [itc] });
      expect(fc5.type).toBeInstanceOf(GraphQLList);
      expect(fc5.type.ofType).toBe(itc.getType());

      const fc6: any = TypeMapper.convertInputFieldConfig([['String']]);
      expect(fc6.type).toBeInstanceOf(GraphQLList);
      expect(fc6.type.ofType).toBeInstanceOf(GraphQLList);
      expect(fc6.type.ofType.ofType).toBe(GraphQLString);

      expect(() => {
        TypeMapper.convertInputFieldConfig([]);
      }).toThrowError(/can accept Array exact with one input type/);
    });

    it('should process inputFieldConfigMap()', () => {
      const icm = TypeMapper.convertInputFieldConfigMap({
        i1: { type: 'String' },
        i2: 'Int',
      });
      expect(icm.i1.type).toBe(GraphQLString);
      expect(icm.i2.type).toBe(GraphQLInt);
    });
  });

  describe('convertArgConfig()', () => {
    it('should accept type with GraphQLInputObjectType', () => {
      const ac = TypeMapper.convertArgConfig({
        type: GraphQLString,
      });
      expect(ac.type).toBe(GraphQLString);

      const objectType = new GraphQLInputObjectType({
        name: 'SomeTypeInput',
        fields: { f: { type: GraphQLString } },
      });
      const ac2 = TypeMapper.convertArgConfig({
        type: objectType,
      });
      expect(ac2.type).toBe(objectType);
    });

    it('should accept GraphQLScalarType', () => {
      const ac = TypeMapper.convertArgConfig(GraphQLString);
      expect(ac.type).toBe(GraphQLString);
    });

    it('should accept GraphQLInputObjectType', () => {
      const type = new GraphQLInputObjectType({
        name: 'InputType',
        fields: () => ({ f: { type: GraphQLInt } }),
      });
      const ac = TypeMapper.convertArgConfig(type);
      expect(ac.type).toBe(type);
    });

    it('should accept GraphQLNonNull', () => {
      const ac: any = TypeMapper.convertArgConfig(new GraphQLNonNull(GraphQLString));
      expect(ac.type).toBeInstanceOf(GraphQLNonNull);
      expect(ac.type.ofType).toBe(GraphQLString);
    });

    it('should accept GraphQLList', () => {
      const ac: any = TypeMapper.convertArgConfig(new GraphQLList(GraphQLString));
      expect(ac.type).toBeInstanceOf(GraphQLList);
      expect(ac.type.ofType).toBe(GraphQLString);
    });

    it('should accept type name as string', () => {
      const ac = TypeMapper.convertArgConfig({
        type: 'String',
      });
      expect(ac.type).toBe(GraphQLString);
    });

    it('should create arg config from GraphQL Schema Language', () => {
      const ac = TypeMapper.convertArgConfig('String');
      expect(ac.type).toBe(GraphQLString);
    });

    it('should lookup type name as string in GQC', () => {
      const itc = InputTypeComposer.create(`input MyArg { a: Int }`);
      GQC.add(itc);

      const ac = TypeMapper.convertArgConfig('MyArg');
      expect(ac.type).toBe(itc.getType());
    });

    it('should create arg config from input type GraphQL Schema Language', () => {
      const fc: any = TypeMapper.convertArgConfig(
        `input MyInputArg {
        a: String,
        b: Int,
      }`
      );
      const itc = new InputTypeComposer(fc.type);
      expect(itc.getTypeName()).toBe('MyInputArg');
      expect(itc.getFieldType('a')).toBe(GraphQLString);
      expect(itc.getFieldType('b')).toBe(GraphQLInt);
    });

    it('should create arg config with Enum type from GraphQL Schema Language', () => {
      const fc: any = TypeMapper.convertArgConfig('enum MyArgEnum { AND OR }');
      expect(fc.type).toBeInstanceOf(GraphQLEnumType);
      const enumValues = fc.type.getValues();
      expect(enumValues[0].name).toBe('AND');
      expect(enumValues[0].value).toBe('AND');
      expect(enumValues[1].name).toBe('OR');
      expect(enumValues[1].value).toBe('OR');
    });

    it('should throw error if provided output type definition', () => {
      expect(() => {
        TypeMapper.convertArgConfig(
          `type MyOutputType {
          a: String,
        }`
        );
      }).toThrowError(/should be InputType, but got output type definition/);
    });

    it('should accept InputTypeComposer', () => {
      const itc = InputTypeComposer.create('input PriceRangeInput { lon: Float, lat: Float }');
      itc.setDescription('Description');
      const ac = TypeMapper.convertArgConfig({
        type: itc,
      });
      expect(ac.type).toBe(itc.getType());
      expect(ac.description).toBe(undefined);

      const ac2 = TypeMapper.convertArgConfig(itc);
      expect(ac2.type).toBe(itc.getType());
      expect(ac2.description).toBe('Description');
    });

    it('should accept EnumTypeComposer', () => {
      const etc = EnumTypeComposer.create('enum MyEnum { V1 V2 }');
      etc.setDescription('Description');
      const ac = TypeMapper.convertArgConfig({
        type: etc,
      });
      expect(ac.type).toBe(etc.getType());
      expect(ac.description).toBe(undefined);

      const ac2 = TypeMapper.convertArgConfig(etc);
      expect(ac2.type).toBe(etc.getType());
      expect(ac2.description).toBe('Description');
    });

    it('should pass unchanged thunk', () => {
      const myTypeThunk = () => 'Int';
      const ac = TypeMapper.convertArgConfig(myTypeThunk);
      expect(ac).toBe(myTypeThunk);
    });

    it('should accept array with one element as type and wrap them with GraphQLList', () => {
      const fc: any = TypeMapper.convertArgConfig(['String']);
      expect(fc.type).toBeInstanceOf(GraphQLList);
      expect(fc.type.ofType).toBe(GraphQLString);

      const fc2: any = TypeMapper.convertArgConfig({ type: ['String'] });
      expect(fc2.type).toBeInstanceOf(GraphQLList);
      expect(fc2.type.ofType).toBe(GraphQLString);

      const fc3: any = TypeMapper.convertArgConfig({ type: [GraphQLString] });
      expect(fc3.type).toBeInstanceOf(GraphQLList);
      expect(fc3.type.ofType).toBe(GraphQLString);

      const itc = InputTypeComposer.create('input PriceRangeInput { lon: Float, lat: Float }');

      const fc4: any = TypeMapper.convertArgConfig([itc]);
      expect(fc4.type).toBeInstanceOf(GraphQLList);
      expect(fc4.type.ofType).toBe(itc.getType());

      const fc5: any = TypeMapper.convertArgConfig({ type: [itc] });
      expect(fc5.type).toBeInstanceOf(GraphQLList);
      expect(fc5.type.ofType).toBe(itc.getType());

      const fc6: any = TypeMapper.convertArgConfig([['String']]);
      expect(fc6.type).toBeInstanceOf(GraphQLList);
      expect(fc6.type.ofType).toBeInstanceOf(GraphQLList);
      expect(fc6.type.ofType.ofType).toBe(GraphQLString);

      expect(() => {
        TypeMapper.convertArgConfig([]);
      }).toThrowError(/can accept Array exact with one input type/);
    });

    it('should throw error if provided TypeComposer', () => {
      const tc = TypeComposer.create('type LonLat { lon: Float, lat: Float }');

      expect(() => {
        TypeMapper.convertArgConfig(({ type: tc }: any));
      }).toThrowError(/\sTypeComposer/);

      expect(() => {
        TypeMapper.convertArgConfig((tc: any));
      }).toThrowError(/\sTypeComposer/);
    });

    it('should process ArgConfigMap', () => {
      const acm = TypeMapper.convertArgConfigMap({
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

      const ts = TypeMapper.parseTypesFromString(gql);
      expect(Array.from(ts.keys())).toEqual(['User', 'Article', 'Record']);

      expect(ts.get('User')).toBeInstanceOf(GraphQLObjectType);
      expect(ts.get('Article')).toBeInstanceOf(GraphQLObjectType);
      expect(ts.get('Record')).toBeInstanceOf(GraphQLInputObjectType);
    });
  });
});
