import { expect } from 'chai';
import { GraphQLString, GraphQLObjectType } from 'graphql';
import { unwrapFieldsType, wrapFieldsType } from '../typeAsFn';


describe('typeAsFn', () => {
  describe('unwrapFieldsType()', () => {
    it('should unwrap types from functions', () => {
      const fieldMap = {
        f1: {
          type: GraphQLString,
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
          type: () => GraphQLString,
        },
      };
      const unwrapped = unwrapFieldsType(fieldMap);
      expect(unwrapped.f1.type).to.equal(GraphQLString);
      expect(unwrapped.f2.type).to.instanceOf(GraphQLObjectType);
      expect(unwrapped.f3.type).to.equal(GraphQLString);
      expect(unwrapped.f3._typeFn).to.be.ok;
      expect(unwrapped.f3._typeFn()).to.equal(GraphQLString);
    });

    it('should pass null, undefined', () => {
      expect(unwrapFieldsType(null)).to.equal(null);
      expect(unwrapFieldsType(undefined)).to.equal(undefined);
    });
  });

  describe('wrapFieldsType()', () => {
    it('should set _typeFn to type', () => {
      const unwrapped = {
        f1: {
          type: GraphQLString,
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
          _typeFn: () => GraphQLString,
        },
      };
      const wrapped = wrapFieldsType(unwrapped);
      expect(wrapped.f1.type).to.equal(GraphQLString);
      expect(wrapped.f2.type).to.instanceOf(GraphQLObjectType);
      expect(wrapped.f3.type).to.be.ok;
      expect(wrapped.f3.type()).to.equal(GraphQLString);
    });

    it('should pass null, undefined', () => {
      expect(wrapFieldsType(null)).to.equal(null);
      expect(wrapFieldsType(undefined)).to.equal(undefined);
    });
  });
});
