jest.disableAutomock();

import {
  GraphQLObjectType,
  GraphQLScalarType,
} from 'graphql';

import Storage from '../storage';


describe('Storage [Class]', () => {
  it('should implements getType by the type name', () => {
    const storage = new Storage();

    const validType = new GraphQLObjectType({ name: 'validType' });
    storage.setType(validType);
    expect(storage.getType('validType')).toEqual(validType);
  });


  it('should implements hasType by the type name', () => {
    const storage = new Storage();

    const validType = new GraphQLObjectType({ name: 'validType' });
    storage.setType(validType);
    expect(storage.hasType('validType')).toBeTruthy();

    expect(storage.hasType('unexistedType')).toBeFalsy();
  });


  it('should implements setType and accept only GraphQLObjectType', () => {
    const storage = new Storage();

    const validType = new GraphQLObjectType({ name: 'validType' });
    storage.setType(validType);
    expect(storage.getType('validType')).toEqual(validType);

    const errTypeObj1 = new GraphQLScalarType({ name: 'validType1', serialize: () => {} });
    expect(() => { storage.setType(errTypeObj1); }).toThrow();

    const errTypeObj2 = { name: '123' };
    expect(() => { storage.setType(errTypeObj2); }).toThrow();
  });

  it('should throw error, if root fields not defined', () => {
    const storage = new Storage();
    storage.clear();

    expect(() => { storage.buildSchema(); }).toThrow();
  });
});
