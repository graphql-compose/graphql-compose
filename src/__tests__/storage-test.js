jest.disableAutomock();

import {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLList,
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


  it('should implements setType and accept only graphQL types', () => {
    const storage = new Storage();

    const validType = new GraphQLObjectType({ name: 'validType' });
    storage.setType(validType);
    expect(storage.getType('validType')).toEqual(validType);

    const validType1 = new GraphQLScalarType({ name: 'validType1', serialize: () => {} });
    storage.setType(validType1);
    expect(storage.getType('validType1')).toEqual(validType1);

    const errTypeObj = { name: '123' };
    expect(() => { storage.setType(errTypeObj); }).toThrow();
  });


  it('should throw error, if passed GraphQLList or GraphQLNonNull. This type does not have name.',
    () => {
      const storage = new Storage();

      const validType = new GraphQLObjectType({ name: 'validType' });
      storage.setType(validType);
      expect(storage.getType('validType')).toEqual(validType);

      const invalid = new GraphQLList(validType);
      expect(() => { storage.setType(invalid); }).toThrow();
    }
  );

  it('should throw error, if root fields not defined', () => {
    const storage = new Storage();
    storage.clear();

    expect(() => { storage.buildSchema(); }).toThrow();
  });
  
  
});
