import { expect } from 'chai';
import { GraphQLString, GraphQLObjectType, GraphQLInputObjectType } from 'graphql';
import TypeComposer from '../../typeComposer';
import InputTypeComposer from '../../inputTypeComposer';
import {
  resolveOutputConfigsAsThunk,
  resolveInputConfigsAsThunk,
  keepConfigsAsThunk,
} from '../configAsThunk';

describe('typeAsThunk', () => {
  describe('resolveOutputConfigsAsThunk()', () => {
    it('should unwrap fields from functions', () => {
      const fieldMap = {
        f0: () => ({
          type: GraphQLString,
          description: 'Field0',
        }),
        f1: () => ({
          type: 'String',
          description: 'Field1',
        }),
        f3: {
          type: new GraphQLObjectType({
            name: 'MyType',
            fields: {
              f11: { type: GraphQLString },
            },
          }),
          description: 'Field3',
        },
        f5: () => ({
          type: TypeComposer.create('type LonLat { lon: Float, lat: Float}'),
          description: 'Field5',
        }),
      };
      const unwrapped = resolveOutputConfigsAsThunk(fieldMap);
      expect(unwrapped.f0.type).to.equal(GraphQLString);
      expect(unwrapped.f0.description).to.equal('Field0');
      expect(unwrapped.f0._fieldAsThunk).to.be.ok;
      expect(unwrapped.f0._fieldAsThunk()).to.eql({
        type: GraphQLString,
        description: 'Field0',
      });

      expect(unwrapped.f1.type).to.equal(GraphQLString);
      expect(unwrapped.f1.description).to.equal('Field1');
      expect(unwrapped.f1._fieldAsThunk).to.be.ok;
      expect(unwrapped.f1._fieldAsThunk()).to.eql({
        type: 'String',
        description: 'Field1',
      });

      expect(unwrapped.f3.type).to.instanceOf(GraphQLObjectType);
      expect(unwrapped.f3.type.name).to.equal('MyType');
      expect(unwrapped.f3.description).to.equal('Field3');

      expect(unwrapped.f5.type).to.instanceOf(GraphQLObjectType);
      expect(unwrapped.f5.type.name).to.equal('LonLat');
      expect(unwrapped.f5.description).to.equal('Field5');
    });

    it('should unwrap types from functions', () => {
      const fieldMap = {
        f1: {
          type: GraphQLString,
        },
        f2: {
          type: () => GraphQLString,
          description: 'Field2',
        },
        f3: {
          type: new GraphQLObjectType({
            name: 'MyType',
            fields: {
              f11: { type: GraphQLString },
            },
          }),
          description: 'Field3',
        },
        f4: {
          type: () => 'String',
        },
        f5: {
          type: () => TypeComposer.create('type LonLat { lon: Float, lat: Float}'),
          description: 'Field5',
        },
      };
      const unwrapped = resolveOutputConfigsAsThunk(fieldMap);

      expect(unwrapped.f1.type).to.equal(GraphQLString);

      expect(unwrapped.f2.type).to.equal(GraphQLString);
      expect(unwrapped.f2._typeAsThunk).to.be.ok;
      expect(unwrapped.f2._typeAsThunk()).to.equal(GraphQLString);

      expect(unwrapped.f3.type).to.instanceOf(GraphQLObjectType);
      expect(unwrapped.f3.type.name).to.equal('MyType');
      expect(unwrapped.f3.description).to.equal('Field3');

      expect(unwrapped.f4.type).to.equal(GraphQLString);
      expect(unwrapped.f4._typeAsThunk).to.be.ok;
      expect(unwrapped.f4._typeAsThunk()).to.equal('String');

      expect(unwrapped.f5.type).to.instanceOf(GraphQLObjectType);
      expect(unwrapped.f5.type.name).to.equal('LonLat');
      expect(unwrapped.f5.description).to.equal('Field5');
    });

    it('should unwrap fields from functions and type from function', () => {
      const fieldMap = {
        f3: () => ({
          type: () => GraphQLString,
          description: 'Field3',
        }),
        f4: () => ({
          type: () => 'String',
          description: 'Field4',
        }),
      };
      const unwrapped = resolveOutputConfigsAsThunk(fieldMap);

      expect(unwrapped.f3.type).to.equal(GraphQLString);
      expect(unwrapped.f3._fieldAsThunk).to.be.ok;
      expect(unwrapped.f3._fieldAsThunk()).to.have.all.keys('type', 'description');
      expect(unwrapped.f3._typeAsThunk).to.be.ok;
      expect(unwrapped.f3._typeAsThunk()).to.equal(GraphQLString);

      expect(unwrapped.f4.type).to.equal(GraphQLString);
      expect(unwrapped.f4._fieldAsThunk).to.be.ok;
      expect(unwrapped.f4._fieldAsThunk()).to.have.all.keys('type', 'description');
      expect(unwrapped.f4._typeAsThunk).to.be.ok;
      expect(unwrapped.f4._typeAsThunk()).to.equal('String');
    });

    it('should works with arg as function', () => {
      const fieldMap = {
        f6: {
          type: GraphQLString,
          args: {
            a1: () => GraphQLString,
            a2: () => ({ type: GraphQLString, description: 'Desc' }),
            a3: { type: () => GraphQLString },
          },
        },
      };
      const unwrapped = resolveOutputConfigsAsThunk(fieldMap);
      const args = unwrapped.f6.args;
      expect(args.a1.type).to.equal(GraphQLString);
      expect(args.a2.type).to.equal(GraphQLString);
      expect(args.a2.description).to.equal('Desc');
      expect(args.a3.type).to.equal(GraphQLString);
    });

    it('should pass null, undefined', () => {
      expect(resolveOutputConfigsAsThunk(null)).to.equal(null);
      expect(resolveOutputConfigsAsThunk(undefined)).to.equal(undefined);
    });
  });


  describe('resolveInputConfigsAsThunk()', () => {
    it('should unwrap fields from functions', () => {
      const fieldMap = {
        f0: () => ({
          type: GraphQLString,
          description: 'Field0',
        }),
        f1: () => ({
          type: 'String',
          description: 'Field1',
        }),
        f3: {
          type: new GraphQLInputObjectType({
            name: 'MyType',
            fields: {
              f11: { type: GraphQLString },
            },
          }),
          description: 'Field3',
        },
        f5: () => ({
          type: InputTypeComposer.create('input LonLat { lon: Float, lat: Float}'),
          description: 'Field5',
        }),
      };
      const unwrapped = resolveInputConfigsAsThunk(fieldMap);
      expect(unwrapped.f0.type).to.equal(GraphQLString);
      expect(unwrapped.f0.description).to.equal('Field0');
      expect(unwrapped.f0._fieldAsThunk).to.be.ok;
      expect(unwrapped.f0._fieldAsThunk()).to.eql({
        type: GraphQLString,
        description: 'Field0',
      });

      expect(unwrapped.f1.type).to.equal(GraphQLString);
      expect(unwrapped.f1.description).to.equal('Field1');
      expect(unwrapped.f1._fieldAsThunk).to.be.ok;
      expect(unwrapped.f1._fieldAsThunk()).to.eql({
        type: 'String',
        description: 'Field1',
      });

      expect(unwrapped.f3.type).to.instanceOf(GraphQLInputObjectType);
      expect(unwrapped.f3.type.name).to.equal('MyType');
      expect(unwrapped.f3.description).to.equal('Field3');

      expect(unwrapped.f5.type).to.instanceOf(GraphQLInputObjectType);
      expect(unwrapped.f5.type.name).to.equal('LonLat');
      expect(unwrapped.f5.description).to.equal('Field5');
    });

    it('should unwrap types from functions', () => {
      const fieldMap = {
        f1: {
          type: GraphQLString,
        },
        f2: {
          type: () => GraphQLString,
          description: 'Field2',
        },
        f3: {
          type: new GraphQLInputObjectType({
            name: 'MyType',
            fields: {
              f11: { type: GraphQLString },
            },
          }),
          description: 'Field3',
        },
        f4: {
          type: () => 'String',
        },
        f5: {
          type: () => InputTypeComposer.create('input LonLat { lon: Float, lat: Float}'),
          description: 'Field5',
        },
      };

      const unwrapped = resolveInputConfigsAsThunk(fieldMap);

      expect(unwrapped.f1.type).to.equal(GraphQLString);

      expect(unwrapped.f2.type).to.equal(GraphQLString);
      expect(unwrapped.f2._typeAsThunk).to.be.ok;
      expect(unwrapped.f2._typeAsThunk()).to.equal(GraphQLString);

      expect(unwrapped.f3.type).to.instanceOf(GraphQLInputObjectType);
      expect(unwrapped.f3.type.name).to.equal('MyType');
      expect(unwrapped.f3.description).to.equal('Field3');

      expect(unwrapped.f4.type).to.equal(GraphQLString);
      expect(unwrapped.f4._typeAsThunk).to.be.ok;
      expect(unwrapped.f4._typeAsThunk()).to.equal('String');

      expect(unwrapped.f5.type).to.instanceOf(GraphQLInputObjectType);
      expect(unwrapped.f5.type.name).to.equal('LonLat');
      expect(unwrapped.f5.description).to.equal('Field5');
    });

    it('should unwrap fields from functions and type from function', () => {
      const fieldMap = {
        f3: () => ({
          type: () => GraphQLString,
          description: 'Field3',
        }),
        f4: () => ({
          type: () => 'String',
          description: 'Field4',
        }),
      };
      const unwrapped = resolveInputConfigsAsThunk(fieldMap);

      expect(unwrapped.f3.type).to.equal(GraphQLString);
      expect(unwrapped.f3.description).to.equal('Field3');
      expect(unwrapped.f3._fieldAsThunk).to.be.ok;
      expect(unwrapped.f3._fieldAsThunk()).to.have.all.keys('type', 'description');
      expect(unwrapped.f3._typeAsThunk).to.be.ok;
      expect(unwrapped.f3._typeAsThunk()).to.equal(GraphQLString);

      expect(unwrapped.f4.type).to.equal(GraphQLString);
      expect(unwrapped.f4.description).to.equal('Field4');
      expect(unwrapped.f4._fieldAsThunk).to.be.ok;
      expect(unwrapped.f4._fieldAsThunk()).to.have.all.keys('type', 'description');
      expect(unwrapped.f4._typeAsThunk).to.be.ok;
      expect(unwrapped.f4._typeAsThunk()).to.equal('String');
    });

    it('should pass null, undefined', () => {
      expect(resolveInputConfigsAsThunk(null)).to.equal(null);
      expect(resolveInputConfigsAsThunk(undefined)).to.equal(undefined);
    });
  });


  describe('keepConfigsAsThunk()', () => {
    it('should set _typeAsThunk to type', () => {
      const unwrapped = {
        f1: {
          type: GraphQLString,
          args: {
            a1: {
              type: GraphQLString,
              _typeAsThunk: () => GraphQLString,
            },
          },
        },
        f2: {
          type: new GraphQLObjectType({
            name: 'MyType',
            fields: {
              f11: { type: GraphQLString },
            },
          }),
        },
        f3: {
          type: GraphQLString,
          _typeAsThunk: () => GraphQLString,
        },
        f4: {
          type: GraphQLString,
          _fieldAsThunk: () => GraphQLString,
        },
        f5: {
          type: GraphQLString,
          _fieldAsThunk: () => ({ type: GraphQLString }),
        },
      };
      const wrapped = keepConfigsAsThunk(unwrapped);
      expect(wrapped.f1.type).to.equal(GraphQLString);
      expect(wrapped.f1.args.a1.type()).to.equal(GraphQLString);
      expect(wrapped.f2.type).to.instanceOf(GraphQLObjectType);
      expect(wrapped.f3.type).to.be.ok;
      expect(wrapped.f3.type()).to.equal(GraphQLString);
      expect(wrapped.f4()).to.equal(GraphQLString);
      expect(wrapped.f5().type).to.equal(GraphQLString);
    });

    it('should pass null, undefined', () => {
      expect(keepConfigsAsThunk(null)).to.equal(null);
      expect(keepConfigsAsThunk(undefined)).to.equal(undefined);
    });
  });
});
