/* @flow strict */

import { schemaComposer, SchemaComposer } from '..';
import { GraphQLList, GraphQLNonNull, GraphQLScalarType } from '../graphql';
import { ScalarTypeComposer } from '../ScalarTypeComposer';

beforeEach(() => {
  schemaComposer.clear();
});

describe('ScalarTypeComposer', () => {
  let scalarType: GraphQLScalarType;
  let stc: ScalarTypeComposer<any>;

  beforeEach(() => {
    scalarType = new GraphQLScalarType({
      name: 'MyScalar',
      serialize: () => {},
    });

    stc = new ScalarTypeComposer(scalarType, schemaComposer);
  });

  describe('create() [static method]', () => {
    it('should create STC by type template string', () => {
      const myTC = ScalarTypeComposer.create('scalar SDLScalar', schemaComposer);
      expect(myTC).toBeInstanceOf(ScalarTypeComposer);
      expect(myTC.getTypeName()).toBe('SDLScalar');
    });

    it('should create STC by GraphQLScalarTypeConfig', () => {
      const myTC = ScalarTypeComposer.create(
        {
          name: 'TestType',
          serialize: () => {},
        },
        schemaComposer
      );
      expect(myTC).toBeInstanceOf(ScalarTypeComposer);
      expect(myTC.getTypeName()).toBe('TestType');
    });

    it('should create TC by GraphQLScalarType', () => {
      const objType = new GraphQLScalarType({
        name: 'TestTypeObj',
        serialize: () => {},
      });
      const myTC = ScalarTypeComposer.create(objType, schemaComposer);
      expect(myTC).toBeInstanceOf(ScalarTypeComposer);
      expect(myTC.getType()).toBe(objType);
    });

    it('should create STC from string', () => {
      const myTC = ScalarTypeComposer.create('MySSS', schemaComposer);
      expect(myTC.getTypeName()).toEqual('MySSS');
    });

    it('should create type and store it in schemaComposer', () => {
      const SomeUserSTC = ScalarTypeComposer.create('SomeUserScalar', schemaComposer);
      expect(schemaComposer.getSTC('SomeUserScalar')).toBe(SomeUserSTC);
    });

    it('createTemp() should not store type in schemaComposer', () => {
      ScalarTypeComposer.createTemp('SomeUserScalar');
      expect(schemaComposer.has('SomeUserScalar')).toBeFalsy();
    });
  });

  describe('serialize methods', () => {
    it('getSerialize()', () => {
      expect(typeof stc.getSerialize()).toBe('function');
    });

    it('setSerialize()', () => {
      const mySerializer = () => {};
      stc.setSerialize(mySerializer);
      expect(stc.getSerialize()).toBe(mySerializer);
    });

    it('getParseValue()', () => {
      expect(typeof stc.getParseValue()).toBe('function');
    });

    it('setParseValue()', () => {
      const myParseValue = () => {};
      stc.setParseValue(myParseValue);
      expect(stc.getParseValue()).toBe(myParseValue);
    });

    it('getParseLiteral()', () => {
      expect(typeof stc.getParseLiteral()).toBe('function');
    });

    it('setParseLiteral()', () => {
      const myParseLiteral = () => {};
      stc.setParseLiteral(myParseLiteral);
      expect(stc.getParseLiteral()).toBe(myParseLiteral);
    });
  });

  describe('type methods', () => {
    it('getType()', () => {
      expect(stc.getType()).toBeInstanceOf(GraphQLScalarType);
    });

    it('getTypeName()', () => {
      expect(stc.getTypeName()).toBe('MyScalar');
    });

    it('setTypeName()', () => {
      expect(stc.getTypeName()).toBe('MyScalar');
      stc.setTypeName('OtherName');
      expect(stc.getTypeName()).toBe('OtherName');
    });

    it('getTypePlural() should return wrapped type with GraphQLList', () => {
      expect(stc.getTypePlural()).toBeInstanceOf(GraphQLList);
      expect(stc.getTypePlural().ofType).toBe(stc.getType());
    });

    it('getTypeNonNull() should return wrapped type with GraphQLNonNull', () => {
      expect(stc.getTypeNonNull()).toBeInstanceOf(GraphQLNonNull);
      expect(stc.getTypeNonNull().ofType).toBe(stc.getType());
    });
  });

  describe('clone()', () => {
    it('should clone type', () => {
      const stc2 = stc.clone('ClonedScalar');
      expect(stc2.getTypeName()).toEqual('ClonedScalar');
      expect(stc.getType()).not.toBe(stc2.getType());

      expect(() => {
        const wrongArgs: any = [];
        stc.clone(...wrongArgs);
      }).toThrowError(/You should provide newTypeName/);
    });
  });

  describe('directive methods', () => {
    it('type level directive methods', () => {
      const tc1 = schemaComposer.createScalarTC(`
        scalar My1 @d0(a: false) @d1(b: "3") @d0(a: true)
      `);
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
  });

  describe('merge()', () => {
    it('should merge with GraphQLScalarType', () => {
      const scalar1 = schemaComposer.createScalarTC(`UInt`);
      const scalar2 = new GraphQLScalarType({
        name: 'UInt2',
        serialize() {
          return 'noop';
        },
      });
      scalar1.merge(scalar2);
      expect(scalar1.getSerialize()()).toEqual('noop');
    });

    it('should merge with ScalarTypeComposer', () => {
      const scalar1 = schemaComposer.createScalarTC(`UInt`);
      const sc2 = new SchemaComposer();
      const scalar2 = sc2.createScalarTC(`UInt2`);
      scalar2.setSerialize(() => 'ok');
      scalar1.merge(scalar2);
      expect(scalar1.getSerialize()()).toEqual('ok');
    });

    it('should throw error on wrong type', () => {
      const scalar1 = schemaComposer.createScalarTC(`UInt`);
      expect(() => scalar1.merge((schemaComposer.createObjectTC('Scalar'): any))).toThrow(
        'Cannot merge ObjectTypeComposer'
      );
    });
  });
});
