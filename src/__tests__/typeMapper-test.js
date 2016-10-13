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
} from 'graphql';
import typeMapper from '../typeMapper';
import TypeComposer from '../typeComposer';
import InputTypeComposer from '../inputTypeComposer';


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

    expect(Array.from(typeMapper.keys())).to.include.members(
      ['String', 'Float', 'Int', 'Boolean', 'ID']
    );
  });


  it('should create object type from template string', () => {
    const type = typeMapper.createType(`
      type IntRange {
        # Max value
        max: Int,
        # Min value
        min: Int!
        # Array of Strings
        arr: [String]
      }
    `);

    expect(type).instanceof(GraphQLObjectType);
    expect(typeMapper.get('IntRange')).to.equal(type);

    const IntRangeTC = new TypeComposer(type);
    expect(IntRangeTC.getTypeName()).to.equal('IntRange');
    expect(IntRangeTC.getFieldNames()).to.include.members(['max', 'min', 'arr']);
    expect(IntRangeTC.getField('max').description).to.equal('Max value');
    expect(IntRangeTC.getField('max').type).to.equal(GraphQLInt);
    expect(IntRangeTC.getField('min').type).instanceof(GraphQLNonNull);
    expect(IntRangeTC.getField('arr').type).instanceof(GraphQLList);
  });


  it('should create input object type from template string', () => {
    const type = typeMapper.createType(`
      input InputIntRange {
        max: Int,
        min: Int!
      }
    `);

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
      it('should accept GraphQLOutputType', () => {
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

      it('should accept type name as string', () => {
        const fc = typeMapper.convertOutputFieldConfig({
          type: 'String',
        });
        expect(fc.type).equal(GraphQLString);
      });

      it('should create field config from type name as string', () => {
        const fc = typeMapper.convertOutputFieldConfig('String');
        expect(fc.type).equal(GraphQLString);
      });

      it('should accept TypeComposer', () => {
        const tc = TypeComposer.create('type PriceRange { lon: Float, lat: Float }');
        const fc = typeMapper.convertOutputFieldConfig({
          type: tc,
        });
        expect(fc.type).equal(tc.getType());

        const fc2 = typeMapper.convertOutputFieldConfig(tc);
        expect(fc2.type).equal(tc.getType());
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
    it('should accept GraphQLInputObjectType', () => {
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

    it('should accept InputTypeComposer', () => {
      const itc = InputTypeComposer.create(
        'input PriceRangeInput { lon: Float, lat: Float }'
      );
      const ic = typeMapper.convertInputFieldConfig({
        type: itc,
      });
      expect(ic.type).equal(itc.getType());

      const ic2 = typeMapper.convertInputFieldConfig(itc);
      expect(ic2.type).equal(itc.getType());
    });

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
    it('should accept GraphQLInputObjectType', () => {
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

    it('should accept type name as string', () => {
      const ac = typeMapper.convertArgConfig({
        type: 'String',
      });
      expect(ac.type).equal(GraphQLString);
    });

    it('should create field config from type name as string', () => {
      const ac = typeMapper.convertArgConfig('String');
      expect(ac.type).equal(GraphQLString);
    });

    it('should accept InputTypeComposer', () => {
      const itc = InputTypeComposer.create(
        'input PriceRangeInput { lon: Float, lat: Float }'
      );
      const ac = typeMapper.convertArgConfig({
        type: itc,
      });
      expect(ac.type).equal(itc.getType());
      const ac2 = typeMapper.convertArgConfig(itc);
      expect(ac2.type).equal(itc.getType());
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
