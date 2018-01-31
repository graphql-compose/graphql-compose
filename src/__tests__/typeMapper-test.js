/* @flow */

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
import typeMapper from '../typeMapper';
import TypeComposer from '../typeComposer';
import InputTypeComposer from '../inputTypeComposer';
import Resolver from '../resolver';
import GQC from '../gqc';

beforeEach(() => {
  GQC.clear();
});

describe('TypeMapper', () => {
  it('should have basic mapper functions', () => {
    typeMapper.set('test', GraphQLString);
    expect(typeMapper.has('test')).toBe(true);
    expect(typeMapper.get('test')).toBe(GraphQLString);
    expect(Array.from(typeMapper.keys())).toContain('test');
    typeMapper.delete('test');
    expect(typeMapper.has('test')).toBe(false);
  });

  it('should add basic scalar GraphQL types', () => {
    expect(typeMapper.get('String')).toBe(GraphQLString);
    expect(typeMapper.get('Float')).toBe(GraphQLFloat);
    expect(typeMapper.get('Int')).toBe(GraphQLInt);
    expect(typeMapper.get('Boolean')).toBe(GraphQLBoolean);
    expect(typeMapper.get('ID')).toBe(GraphQLID);

    expect(Array.from(typeMapper.keys())).toEqual(
      expect.arrayContaining(['String', 'Float', 'Int', 'Boolean', 'ID'])
    );
  });

  it('should create object type from template string', () => {
    const type: GraphQLObjectType = (typeMapper.createType(
      `
      type IntRange {
        # Max value
        max: Int,
        # Min value
        min: Int!
        # Array of Strings
        arr: [String]
      }
    `
    ): any);

    expect(type).toBeInstanceOf(GraphQLObjectType);
    expect(typeMapper.get('IntRange')).toBe(type);

    const IntRangeTC = new TypeComposer(type);
    expect(IntRangeTC.getTypeName()).toBe('IntRange');
    expect(IntRangeTC.getFieldNames()).toEqual(expect.arrayContaining(['max', 'min', 'arr']));
    expect(IntRangeTC.getField('max').description).toBe('Max value');
    expect(IntRangeTC.getField('max').type).toBe(GraphQLInt);
    expect(IntRangeTC.getField('min').type).toBeInstanceOf(GraphQLNonNull);
    expect(IntRangeTC.getField('arr').type).toBeInstanceOf(GraphQLList);
  });

  it('should create input object type from template string', () => {
    const type: GraphQLInputObjectType = (typeMapper.createType(
      `
      input InputIntRange {
        max: Int,
        min: Int!
      }
    `
    ): any);

    expect(type).toBeInstanceOf(GraphQLInputObjectType);
    expect(typeMapper.get('InputIntRange')).toBe(type);

    const IntRangeTC = new InputTypeComposer(type);
    expect(IntRangeTC.getTypeName()).toBe('InputIntRange');
    expect(IntRangeTC.getField('max').type).toBe(GraphQLInt);
    expect(IntRangeTC.getField('min').type).toBeInstanceOf(GraphQLNonNull);
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

      it('should lookup type name as string in GQC', () => {
        const tc = TypeComposer.create(`type MyType { a: Int }`);
        GQC.add(tc);

        const fc = typeMapper.convertOutputFieldConfig('MyType');
        expect(fc.type).toBe(tc.getType());
      });

      it('should create field config from GraphQL Schema Language', () => {
        const fc = typeMapper.convertOutputFieldConfig(
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
        }).toThrowError(/should be OutputType, but got input type definition/);
      });

      it('should accept TypeComposer', () => {
        const tc = TypeComposer.create('type PriceRange { lon: Float, lat: Float }');
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

      it('should accept Resolver', () => {
        const resolver = new Resolver({
          name: 'find',
          type: 'Float',
          args: {
            a1: 'String',
          },
          resolve: () => 123,
        });
        const fc: any = typeMapper.convertOutputFieldConfig(resolver);
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

        const tc = TypeComposer.create('type PriceRange { lon: Float, lat: Float }');

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
        const itc = InputTypeComposer.create('input LonLatInput { lon: Float, lat: Float }');

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

    it('should lookup type name as string in GQC', () => {
      const itc = InputTypeComposer.create(`input MyInput { a: Int }`);
      GQC.add(itc);

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
      const itc = new InputTypeComposer(fc.type);
      expect(itc.getTypeName()).toBe('MyInputType');
      expect(itc.getFieldType('a')).toBe(GraphQLString);
      expect(itc.getFieldType('b')).toBe(GraphQLInt);
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
      const itc = InputTypeComposer.create('input PriceRangeInput { lon: Float, lat: Float }');
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

    it('should throw error if provided TypeComposer', () => {
      const tc = TypeComposer.create('type LonLat { lon: Float, lat: Float }');

      expect(() => {
        typeMapper.convertInputFieldConfig({
          type: (tc: any),
        });
      }).toThrowError(/\sTypeComposer/);

      expect(() => {
        typeMapper.convertInputFieldConfig((tc: any));
      }).toThrowError(/\sTypeComposer/);
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

      const itc = InputTypeComposer.create('input PriceRangeInput { lon: Float, lat: Float }');

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

    it('should lookup type name as string in GQC', () => {
      const itc = InputTypeComposer.create(`input MyArg { a: Int }`);
      GQC.add(itc);

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
      const itc = new InputTypeComposer(fc.type);
      expect(itc.getTypeName()).toBe('MyInputArg');
      expect(itc.getFieldType('a')).toBe(GraphQLString);
      expect(itc.getFieldType('b')).toBe(GraphQLInt);
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
      const itc = InputTypeComposer.create('input PriceRangeInput { lon: Float, lat: Float }');
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

      const itc = InputTypeComposer.create('input PriceRangeInput { lon: Float, lat: Float }');

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

    it('should throw error if provided TypeComposer', () => {
      const tc = TypeComposer.create('type LonLat { lon: Float, lat: Float }');

      expect(() => {
        typeMapper.convertArgConfig(({ type: tc }: any));
      }).toThrowError(/\sTypeComposer/);

      expect(() => {
        typeMapper.convertArgConfig((tc: any));
      }).toThrowError(/\sTypeComposer/);
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

      expect(ts.get('User')).toBeInstanceOf(GraphQLObjectType);
      expect(ts.get('Article')).toBeInstanceOf(GraphQLObjectType);
      expect(ts.get('Record')).toBeInstanceOf(GraphQLInputObjectType);
    });
  });
});
