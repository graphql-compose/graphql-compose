/* @flow strict */

import { schemaComposer } from '..';
import { GraphQLObjectType } from '../graphql';
import { NonNullComposer } from '../NonNullComposer';
import { ListComposer } from '../ListComposer';
import { ThunkComposer } from '../ThunkComposer';
import { ObjectTypeComposer } from '../ObjectTypeComposer';

beforeEach(() => {
  schemaComposer.clear();
});

describe('ThunkComposer', () => {
  let tc: ThunkComposer<any, any>;
  beforeEach(() => {
    tc = new ThunkComposer(() => {
      return schemaComposer.createTC(`type User { name: Int }`);
    }, 'User');
  });

  describe('getter ofType', () => {
    it('should call `thunk` once and memoize result', () => {
      const fn = jest.fn(() => 'Some calculated type');
      const tc2 = new ThunkComposer(fn, 'SomeType');
      expect(fn).toHaveBeenCalledTimes(0);
      expect(tc2.ofType).toBe('Some calculated type');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(tc2.ofType).toBe('Some calculated type');
      expect(tc2.ofType).toBe('Some calculated type');
      expect(fn).toHaveBeenCalledTimes(1);

      // check recalculation
      tc2._typeFromThunk = null;
      expect(tc2.ofType).toBe('Some calculated type');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  it('getType()', () => {
    const type: any = tc.getType();
    expect(type).toBeInstanceOf(GraphQLObjectType);
    expect(type.name).toBe('User');
  });

  describe('getTypeName()', () => {
    it('should return type name provided via constructor', () => {
      const tc2 = new ThunkComposer(() => {
        return schemaComposer.createTC(`type User { name: Int }`);
      }, 'SomeUser');
      expect(tc2.getTypeName()).toBe('SomeUser');
    });

    it('should return name from type if it evaluated', () => {
      const tc2 = new ThunkComposer(() => {
        return schemaComposer.createTC(`type User { name: Int }`);
      }, 'SomeUser');
      expect(tc2.getTypeName()).toBe('SomeUser');
      tc2.getType();
      expect(tc2.getTypeName()).toBe('User');
    });

    it('should evaluate type if name not provided via constructor', () => {
      const tc2 = new ThunkComposer(() => {
        return schemaComposer.createTC(`type User { name: Int }`);
      });
      expect(tc2._typeFromThunk).toBeUndefined();
      expect(tc2.getTypeName()).toBe('User');
      expect(tc2._typeFromThunk).toBeDefined();
    });
  });

  it('getTypePlural() should return wrapped type with ListComposer', () => {
    const tc2 = tc.getTypePlural();
    expect(tc2).toBeInstanceOf(ListComposer);
    expect(tc2.ofType).toBe(tc);
    expect(tc2.getTypeName()).toBe('[User]');
  });

  it('getTypeNonNull() should return wrapped type with NonNullComposer', () => {
    expect(tc.getTypeNonNull()).toBeInstanceOf(NonNullComposer);
    expect(tc.getTypeNonNull().ofType).toBe(tc);
  });

  it('getUnwrappedTC() should return NamedTypeComposer', () => {
    const UserTC1 = tc.getUnwrappedTC();
    expect(UserTC1).toBeInstanceOf(ObjectTypeComposer);
    expect(UserTC1.getTypeName()).toBe('User');

    // should unwrap deeply wrapped Types
    const tc2: any = schemaComposer.typeMapper.convertSDLWrappedTypeName('[[[User]]]');
    const UserTC2 = tc2.getUnwrappedTC();
    expect(UserTC2.getTypeName()).toBe('User');
    expect(UserTC1).toBe(UserTC2);
  });
});
