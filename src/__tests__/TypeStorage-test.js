/* @flow strict */

import { TypeStorage } from '../TypeStorage';
import { GraphQLString } from '../graphql';

let typeStorage;

describe('typeStorage', () => {
  beforeEach(() => {
    typeStorage = new TypeStorage();
  });

  it('should be instance of Map', () => {
    expect(typeStorage).toBeInstanceOf(TypeStorage);
  });

  it('should work `get`, `set`, `has`, `clear` methods and `size` property', () => {
    expect(typeStorage.size).toEqual(0);
    typeStorage.set('MyType', GraphQLString);
    expect(typeStorage.get('MyType')).toEqual(GraphQLString);
    expect(typeStorage.has('MyType')).toEqual(true);
    expect(typeStorage.size).toEqual(1);
    typeStorage.clear();
    expect(typeStorage.size).toEqual(0);
  });

  describe('getOrSet() method', () => {
    it('should return existed value', () => {
      typeStorage.set('MyType', GraphQLString);
      expect(typeStorage.getOrSet('MyType', () => ('SomeOtherType': any))).toEqual(GraphQLString);
    });

    it('should set new type as function and return type, if key not exists', () => {
      expect(typeStorage.getOrSet('MyType', () => GraphQLString)).toEqual(GraphQLString);
      expect(typeStorage.get('MyType')).toEqual(GraphQLString);
    });

    it('should set new type and return it, if key not exists', () => {
      expect(typeStorage.getOrSet('MyType', GraphQLString)).toEqual(GraphQLString);
      expect(typeStorage.get('MyType')).toEqual(GraphQLString);
    });

    it('should not set new value if it is empty', () => {
      expect(typeStorage.getOrSet('MyType', () => (null: any))).toEqual(null);
      expect(typeStorage.has('MyType')).toEqual(false);
    });
  });
});
