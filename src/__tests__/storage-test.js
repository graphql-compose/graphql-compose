import { expect } from 'chai';
import {
  GraphQLObjectType,
  GraphQLScalarType,
} from 'graphql';
import Storage from '../storage';
import TypeComposer from '../typeComposer';


describe('Storage [Class]', () => {
  const someTC = new TypeComposer(
    new GraphQLObjectType({ name: 'validType' })
  );


  it('should implements `add` method that accepts only TypeComposer', () => {
    const storage = new Storage();
    storage.add(someTC);
    expect(storage.get('validType')).to.equal(someTC);

    const errTypeObj1 = new GraphQLScalarType({ name: 'validType1', serialize: () => {} });
    expect(() => { storage.add(errTypeObj1); }).throw();

    const errTypeObj2 = { name: '123' };
    expect(() => { storage.add(errTypeObj2); }).throw();
  });


  it('should implements `get` method', () => {
    const storage = new Storage();
    storage.add(someTC);
    expect(storage.get('validType')).to.equal(someTC);
  });


  it('should implements `has` method`', () => {
    const storage = new Storage();
    storage.add(someTC);
    expect(storage.has('validType')).to.be.true
    expect(storage.has('unexistedType')).to.be.false;
  });


  describe('buildSchema', () => {
    it('should throw error, if root fields not defined', () => {
      const storage = new Storage();
      storage.clear();

      expect(() => { storage.buildSchema(); }).throw();
    });
  });


  describe('removeEmptyTypes', () => {
    it('should remove fields with Types which have no fields', () => {
      const storage = new Storage();
      const typeWithoutFieldsTC = storage.get('Stub');
      typeWithoutFieldsTC.setFields({});

      const viewerTC = storage.get('Viewer');
      viewerTC.setFields({
        name: 'String',
        stub: typeWithoutFieldsTC,
      });

      storage.removeEmptyTypes(viewerTC);
      expect(viewerTC.hasField('stub')).to.be.false;
    });

    it('should not produce Maximum call stack size exceeded', () => {
      const storage = new Storage();
      const userTC = storage.get('User');
      userTC.addField('friend', userTC);

      storage.removeEmptyTypes(userTC);
    });
  });
});
