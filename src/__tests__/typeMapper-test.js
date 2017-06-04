import { expect } from 'chai';
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
} from 'graphql';
import typeMapper from '../typeMapper';
import TypeComposer from '../typeComposer';
import InputTypeComposer from '../inputTypeComposer';
import Resolver from '../resolver';

describe('TypeMapper', () => {
  it('should have basic mapper functions', () => {
    typeMapper.set('test', GraphQLString);
    expect(typeMapper.has('test')).to.be.true;
    expect(typeMapper.get('test')).to.be.equal(GraphQLString);
    expect(Array.from(typeMapper.keys())).to.include('test');
    typeMapper.delete('test');
    expect(typeMapper.has('test')).to.be.false;
  });

  it('should add basic scalar GraphQL types', () => {
    expect(typeMapper.get('String')).to.be.equal(GraphQLString);
    expect(typeMapper.get('Float')).to.be.equal(GraphQLFloat);
    expect(typeMapper.get('Int')).to.be.equal(GraphQLInt);
    expect(typeMapper.get('Boolean')).to.be.equal(GraphQLBoolean);
    expect(typeMapper.get('ID')).to.be.equal(GraphQLID);

    expect(Array.from(typeMapper.keys())).to.include.members([
      'String',
      'Float',
      'Int',
      'Boolean',
      'ID',
    ]);
  });

  it('should create object type from template string', () => {
    const type = typeMapper.createType(
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
    );

    expect(type).instanceof(GraphQLObjectType);
    expect(typeMapper.get('IntRange')).to.equal(type);

    const IntRangeTC = new TypeComposer(type);
    expect(IntRangeTC.getTypeName()).to.equal('IntRange');
    expect(IntRangeTC.getFieldNames()).to.include.members([
      'max',
      'min',
      'arr',
    ]);
    expect(IntRangeTC.getField('max').description).to.equal('Max value');
    expect(IntRangeTC.getField('max').type).to.equal(GraphQLInt);
    expect(IntRangeTC.getField('min').type).instanceof(GraphQLNonNull);
    expect(IntRangeTC.getField('arr').type).instanceof(GraphQLList);
  });

  it('should create input object type from template string', () => {
    const type = typeMapper.createType(
      `
      input InputIntRange {
        max: Int,
        min: Int!
      }
    `
    );

    expect(type).instanceof(GraphQLInputObjectType);
    expect(typeMapper.get('InputIntRange')).to.equal(type);

    const IntRangeTC = new InputTypeComposer(type);
    expect(IntRangeTC.getTypeName()).to.equal('InputIntRange');
    expect(IntRangeTC.getField('max').type).to.equal(GraphQLInt);
    expect(IntRangeTC.getField('min').type).instanceof(GraphQLNonNull);
  });

  it('should return wrapped type', () => {
    expect(typeMapper.getWrapped('String!')).instanceof(GraphQLNonNull);
    expect(typeMapper.getWrapped('[String]')).instanceof(GraphQLList);

    expect(typeMapper.getWrapped('[String]!')).instanceof(GraphQLNonNull);
    expect(typeMapper.getWrapped('[String]!').ofType).instanceof(GraphQLList);

    expect(typeMapper.getWrapped('String')).equal(GraphQLString);
  });

  describe('convertOutputFieldConfig()', () => {
    describe('converting field type', () => {
      it('should accept type with GraphQLOutputType', () => {
        const fc = typeMapper.convertOutputFieldConfig({
          type: GraphQLString,
        });
        expect(fc.type).equal(GraphQLString);

        const objectType = new GraphQLObjectType({
          name: 'SomeType',
          fields: { f: GraphQLString },
        });
        const fc2 = typeMapper.convertOutputFieldConfig({
          type: objectType,
        });
        expect(fc2.type).equal(objectType);
      });

      it('should accept GraphQLScalarType', () => {
        const fc = typeMapper.convertOutputFieldConfig(GraphQLString);
        expect(fc.type).equal(GraphQLString);
      });

      it('should accept GraphQLObjectType', () => {
        const type = new GraphQLObjectType({
          name: 'Test',
          fields: () => {},
        });
        const fc = typeMapper.convertOutputFieldConfig(type);
        expect(fc.type).equal(type);
      });

      it('should accept GraphQLNonNull', () => {
        const fc = typeMapper.convertOutputFieldConfig(new GraphQLNonNull(GraphQLString));
        expect(fc.type).instanceof(GraphQLNonNull);
        expect(fc.type.ofType).equal(GraphQLString);
      });

      it('should accept GraphQLList', () => {
        const fc = typeMapper.convertOutputFieldConfig(new GraphQLList(GraphQLString));
        expect(fc.type).instanceof(GraphQLList);
        expect(fc.type.ofType).equal(GraphQLString);
      });

      it('should accept type as string', () => {
        const fc = typeMapper.convertOutputFieldConfig({
          type: 'String',
        });
        expect(fc.type).equal(GraphQLString);
      });

      it('should create field config from type as string', () => {
        const fc = typeMapper.convertOutputFieldConfig('String');
        expect(fc.type).equal(GraphQLString);
      });

      it('should create field config from GraphQL Schema Language', () => {
        const fc = typeMapper.convertOutputFieldConfig(
          `type MyOutputType {
          a: String,
          b: Int,
        }`
        );
        const tc = new TypeComposer(fc.type);
        expect(tc.getTypeName()).equal('MyOutputType');
        expect(tc.getFieldType('a')).equal(GraphQLString);
        expect(tc.getFieldType('b')).equal(GraphQLInt);
      });

      it('should create field with Enum type from GraphQL Schema Language', () => {
        const fc = typeMapper.convertOutputFieldConfig(
          'enum MyEnum { AND OR }'
        );
        expect(fc.type).instanceof(GraphQLEnumType);
        const enumValues = fc.type.getValues();
        expect(enumValues[0].name).equal('AND');
        expect(enumValues[0].value).equal('AND');
        expect(enumValues[1].name).equal('OR');
        expect(enumValues[1].value).equal('OR');
      });

      it('should throw error if provided input type definition', () => {
        expect(() => {
          typeMapper.convertOutputFieldConfig(
            `input MyInputType {
            a: String,
          }`
          );
        }).to.throw(/should be OutputType, but got input type definition/);
      });

      it('should accept TypeComposer', () => {
        const tc = TypeComposer.create(
          'type PriceRange { lon: Float, lat: Float }'
        );
        tc.setDescription('Description');
        const fc = typeMapper.convertOutputFieldConfig({
          type: tc,
        });
        expect(fc.type).equal(tc.getType());
        expect(fc.description).equal(undefined);

        const fc2 = typeMapper.convertOutputFieldConfig(tc);
        expect(fc2.type).equal(tc.getType());
        expect(fc2.description).equal('Description');
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
        const fc = typeMapper.convertOutputFieldConfig(resolver);
        expect(fc.type).equal(GraphQLFloat);
        expect(fc.args.a1.type).equal(GraphQLString);
        expect(fc.resolve()).equal(123);
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
        expect(fc.type).equal(GraphQLFloat);
        expect(fc.args).equal(undefined);
        expect(fc.resolve).equal(undefined);
      });

      it('should pass unchanged thunk', () => {
        const myTypeThunk = () => 'Int';
        const fc = typeMapper.convertOutputFieldConfig(myTypeThunk);
        expect(fc).equal(myTypeThunk);
      });

      it(
        'should accept array with one element as type and wrap them with GraphQLList',
        () => {
          const fc = typeMapper.convertOutputFieldConfig(['String']);
          expect(fc.type).instanceof(GraphQLList);
          expect(fc.type.ofType).to.equal(GraphQLString);

          const fc2 = typeMapper.convertOutputFieldConfig({ type: ['String'] });
          expect(fc2.type).instanceof(GraphQLList);
          expect(fc2.type.ofType).to.equal(GraphQLString);

          const fc3 = typeMapper.convertOutputFieldConfig({
            type: [GraphQLString],
          });
          expect(fc3.type).instanceof(GraphQLList);
          expect(fc3.type.ofType).to.equal(GraphQLString);

          const tc = TypeComposer.create(
            'type PriceRange { lon: Float, lat: Float }'
          );

          const fc4 = typeMapper.convertOutputFieldConfig([tc]);
          expect(fc4.type).instanceof(GraphQLList);
          expect(fc4.type.ofType).to.equal(tc.getType());

          const fc5 = typeMapper.convertOutputFieldConfig({ type: [tc] });
          expect(fc5.type).instanceof(GraphQLList);
          expect(fc5.type.ofType).to.equal(tc.getType());

          expect(() => {
            typeMapper.convertOutputFieldConfig([]);
          }).to.throw(/can accept Array exact with one output type/);
        }
      );

      it('should throw error if provided InputTypeComposer', () => {
        const itc = InputTypeComposer.create(
          'input LonLatInput { lon: Float, lat: Float }'
        );

        expect(() => {
          typeMapper.convertOutputFieldConfig({
            type: itc,
          });
        }).to.throw(/InputTypeComposer/);

        expect(() => {
          typeMapper.convertOutputFieldConfig(itc);
        }).to.throw(/InputTypeComposer/);
      });
    });

    it('should convert args types', () => {
      const fc = typeMapper.convertOutputFieldConfig({
        type: 'String',
        args: {
          a1: { type: 'String' },
          a2: 'Int',
        },
      });
      expect(fc.args.a1.type).equal(GraphQLString);
      expect(fc.args.a2.type).equal(GraphQLInt);
    });

    it('should process outputFieldConfigMap()', () => {
      const fcm = typeMapper.convertOutputFieldConfigMap({
        f1: 'String',
        f2: 'Int',
      });
      expect(fcm.f1.type).equal(GraphQLString);
      expect(fcm.f2.type).equal(GraphQLInt);
    });
  });

  describe('convertInputFieldConfig()', () => {
    it('should accept type with GraphQLInputObjectType', () => {
      const ic = typeMapper.convertInputFieldConfig({
        type: GraphQLString,
      });
      expect(ic.type).equal(GraphQLString);

      const objectType = new GraphQLInputObjectType({
        name: 'SomeTypeInput',
        fields: { f: GraphQLString },
      });
      const ic2 = typeMapper.convertInputFieldConfig({
        type: objectType,
      });
      expect(ic2.type).equal(objectType);
    });

    it('should accept GraphQLScalarType', () => {
      const ic = typeMapper.convertInputFieldConfig(GraphQLString);
      expect(ic.type).equal(GraphQLString);
    });

    it('should accept GraphQLInputObjectType', () => {
      const type = new GraphQLInputObjectType({
        name: 'InputType',
        fields: () => {},
      });
      const ic = typeMapper.convertInputFieldConfig(type);
      expect(ic.type).equal(type);
    });

    it('should accept GraphQLNonNull', () => {
      const ic = typeMapper.convertInputFieldConfig(new GraphQLNonNull(GraphQLString));
      expect(ic.type).instanceof(GraphQLNonNull);
      expect(ic.type.ofType).equal(GraphQLString);
    });

    it('should accept GraphQLList', () => {
      const ic = typeMapper.convertInputFieldConfig(new GraphQLList(GraphQLString));
      expect(ic.type).instanceof(GraphQLList);
      expect(ic.type.ofType).equal(GraphQLString);
    });

    it('should accept type name as string', () => {
      const ic = typeMapper.convertInputFieldConfig({
        type: 'String',
      });
      expect(ic.type).equal(GraphQLString);
    });

    it('should create field config from type name as string', () => {
      const ic = typeMapper.convertInputFieldConfig('String');
      expect(ic.type).equal(GraphQLString);
    });

    it('should create field config from input type GraphQL Schema Language', () => {
      const fc = typeMapper.convertInputFieldConfig(
        `input MyInputType {
          a: String,
          b: Int,
        }`
      );
      const itc = new InputTypeComposer(fc.type);
      expect(itc.getTypeName()).equal('MyInputType');
      expect(itc.getFieldType('a')).equal(GraphQLString);
      expect(itc.getFieldType('b')).equal(GraphQLInt);
    });

    it('should create field with Enum type from GraphQL Schema Language', () => {
      const fc = typeMapper.convertInputFieldConfig(
        'enum MyInputEnum { AND OR }'
      );
      expect(fc.type).instanceof(GraphQLEnumType);
      const enumValues = fc.type.getValues();
      expect(enumValues[0].name).equal('AND');
      expect(enumValues[0].value).equal('AND');
      expect(enumValues[1].name).equal('OR');
      expect(enumValues[1].value).equal('OR');
    });

    it('should throw error if provided output type definition', () => {
      expect(() => {
        typeMapper.convertInputFieldConfig(
          `type MyOutputType {
          a: String,
        }`
        );
      }).to.throw(/should be InputType, but got output type definition/);
    });

    it('should accept InputTypeComposer', () => {
      const itc = InputTypeComposer.create(
        'input PriceRangeInput { lon: Float, lat: Float }'
      );
      itc.setDescription('Description');
      const ic = typeMapper.convertInputFieldConfig({
        type: itc,
      });
      expect(ic.type).equal(itc.getType());
      expect(ic.description).equal(undefined);

      const ic2 = typeMapper.convertInputFieldConfig(itc);
      expect(ic2.type).equal(itc.getType());
      expect(ic2.description).equal('Description');
    });

    it('should throw error if provided TypeComposer', () => {
      const tc = TypeComposer.create('type LonLat { lon: Float, lat: Float }');

      expect(() => {
        typeMapper.convertInputFieldConfig({
          type: tc,
        });
      }).to.throw(/\sTypeComposer/);

      expect(() => {
        typeMapper.convertInputFieldConfig(tc);
      }).to.throw(/\sTypeComposer/);
    });

    it('should pass unchanged thunk', () => {
      const myTypeThunk = () => 'Int';
      const tc = typeMapper.convertInputFieldConfig(myTypeThunk);
      expect(tc).equal(myTypeThunk);
    });

    it(
      'should accept array with one element as type and wrap them with GraphQLList',
      () => {
        const fc = typeMapper.convertInputFieldConfig(['String']);
        expect(fc.type).instanceof(GraphQLList);
        expect(fc.type.ofType).to.equal(GraphQLString);

        const fc2 = typeMapper.convertInputFieldConfig({ type: ['String'] });
        expect(fc2.type).instanceof(GraphQLList);
        expect(fc2.type.ofType).to.equal(GraphQLString);

        const fc3 = typeMapper.convertInputFieldConfig({
          type: [GraphQLString],
        });
        expect(fc3.type).instanceof(GraphQLList);
        expect(fc3.type.ofType).to.equal(GraphQLString);

        const itc = InputTypeComposer.create(
          'input PriceRangeInput { lon: Float, lat: Float }'
        );

        const fc4 = typeMapper.convertInputFieldConfig([itc]);
        expect(fc4.type).instanceof(GraphQLList);
        expect(fc4.type.ofType).to.equal(itc.getType());

        const fc5 = typeMapper.convertInputFieldConfig({ type: [itc] });
        expect(fc5.type).instanceof(GraphQLList);
        expect(fc5.type.ofType).to.equal(itc.getType());

        expect(() => {
          typeMapper.convertInputFieldConfig([]);
        }).to.throw(/can accept Array exact with one input type/);
      }
    );

    it('should process inputFieldConfigMap()', () => {
      const icm = typeMapper.convertInputFieldConfigMap({
        i1: { type: 'String' },
        i2: 'Int',
      });
      expect(icm.i1.type).equal(GraphQLString);
      expect(icm.i2.type).equal(GraphQLInt);
    });
  });

  describe('convertArgConfig()', () => {
    it('should accept type with GraphQLInputObjectType', () => {
      const ac = typeMapper.convertArgConfig({
        type: GraphQLString,
      });
      expect(ac.type).equal(GraphQLString);

      const objectType = new GraphQLInputObjectType({
        name: 'SomeTypeInput',
        fields: { f: GraphQLString },
      });
      const ac2 = typeMapper.convertArgConfig({
        type: objectType,
      });
      expect(ac2.type).equal(objectType);
    });

    it('should accept GraphQLScalarType', () => {
      const ac = typeMapper.convertArgConfig(GraphQLString);
      expect(ac.type).equal(GraphQLString);
    });

    it('should accept GraphQLInputObjectType', () => {
      const type = new GraphQLInputObjectType({
        name: 'InputType',
        fields: () => {},
      });
      const ac = typeMapper.convertArgConfig(type);
      expect(ac.type).equal(type);
    });

    it('should accept GraphQLNonNull', () => {
      const ac = typeMapper.convertArgConfig(new GraphQLNonNull(GraphQLString));
      expect(ac.type).instanceof(GraphQLNonNull);
      expect(ac.type.ofType).equal(GraphQLString);
    });

    it('should accept GraphQLList', () => {
      const ac = typeMapper.convertArgConfig(new GraphQLList(GraphQLString));
      expect(ac.type).instanceof(GraphQLList);
      expect(ac.type.ofType).equal(GraphQLString);
    });

    it('should accept type name as string', () => {
      const ac = typeMapper.convertArgConfig({
        type: 'String',
      });
      expect(ac.type).equal(GraphQLString);
    });

    it('should create arg config from GraphQL Schema Language', () => {
      const ac = typeMapper.convertArgConfig('String');
      expect(ac.type).equal(GraphQLString);
    });

    it('should create arg config from input type GraphQL Schema Language', () => {
      const fc = typeMapper.convertArgConfig(
        `input MyInputArg {
        a: String,
        b: Int,
      }`
      );
      const itc = new InputTypeComposer(fc.type);
      expect(itc.getTypeName()).equal('MyInputArg');
      expect(itc.getFieldType('a')).equal(GraphQLString);
      expect(itc.getFieldType('b')).equal(GraphQLInt);
    });

    it('should create arg config with Enum type from GraphQL Schema Language', () => {
      const fc = typeMapper.convertArgConfig(
        'enum MyArgEnum { AND OR }'
      );
      expect(fc.type).instanceof(GraphQLEnumType);
      const enumValues = fc.type.getValues();
      expect(enumValues[0].name).equal('AND');
      expect(enumValues[0].value).equal('AND');
      expect(enumValues[1].name).equal('OR');
      expect(enumValues[1].value).equal('OR');
    });

    it('should throw error if provided output type definition', () => {
      expect(() => {
        typeMapper.convertArgConfig(
          `type MyOutputType {
          a: String,
        }`
        );
      }).to.throw(/should be InputType, but got output type definition/);
    });

    it('should accept InputTypeComposer', () => {
      const itc = InputTypeComposer.create(
        'input PriceRangeInput { lon: Float, lat: Float }'
      );
      itc.setDescription('Description');
      const ac = typeMapper.convertArgConfig({
        type: itc,
      });
      expect(ac.type).equal(itc.getType());
      expect(ac.description).equal(undefined);

      const ac2 = typeMapper.convertArgConfig(itc);
      expect(ac2.type).equal(itc.getType());
      expect(ac2.description).equal('Description');
    });

    it('should pass unchanged thunk', () => {
      const myTypeThunk = () => 'Int';
      const ac = typeMapper.convertArgConfig(myTypeThunk);
      expect(ac).equal(myTypeThunk);
    });

    it(
      'should accept array with one element as type and wrap them with GraphQLList',
      () => {
        const fc = typeMapper.convertArgConfig(['String']);
        expect(fc.type).instanceof(GraphQLList);
        expect(fc.type.ofType).to.equal(GraphQLString);

        const fc2 = typeMapper.convertArgConfig({ type: ['String'] });
        expect(fc2.type).instanceof(GraphQLList);
        expect(fc2.type.ofType).to.equal(GraphQLString);

        const fc3 = typeMapper.convertArgConfig({ type: [GraphQLString] });
        expect(fc3.type).instanceof(GraphQLList);
        expect(fc3.type.ofType).to.equal(GraphQLString);

        const itc = InputTypeComposer.create(
          'input PriceRangeInput { lon: Float, lat: Float }'
        );

        const fc4 = typeMapper.convertArgConfig([itc]);
        expect(fc4.type).instanceof(GraphQLList);
        expect(fc4.type.ofType).to.equal(itc.getType());

        const fc5 = typeMapper.convertArgConfig({ type: [itc] });
        expect(fc5.type).instanceof(GraphQLList);
        expect(fc5.type.ofType).to.equal(itc.getType());

        expect(() => {
          typeMapper.convertArgConfig([]);
        }).to.throw(/can accept Array exact with one input type/);
      }
    );

    it('should throw error if provided TypeComposer', () => {
      const tc = TypeComposer.create('type LonLat { lon: Float, lat: Float }');

      expect(() => {
        typeMapper.convertArgConfig({
          type: tc,
        });
      }).to.throw(/\sTypeComposer/);

      expect(() => {
        typeMapper.convertArgConfig(tc);
      }).to.throw(/\sTypeComposer/);
    });

    it('should process ArgConfigMap', () => {
      const acm = typeMapper.convertArgConfigMap({
        a1: { type: 'String' },
        a2: 'Int',
      });
      expect(acm.a1.type).equal(GraphQLString);
      expect(acm.a2.type).equal(GraphQLInt);
    });
  });
});
