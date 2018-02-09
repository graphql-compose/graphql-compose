/* @flow */

import { SchemaComposer } from '../';

describe('Storage [Class]', () => {
  it('should implements `add` method', () => {
    const storage = new SchemaComposer();
    const someTC = storage.TypeComposer.create({ name: 'validType' });
    storage.add(someTC);
    expect(storage.get('validType')).toBe(someTC);
  });

  it('should implements `get` method', () => {
    const storage = new SchemaComposer();
    const someTC = storage.TypeComposer.create({ name: 'validType' });
    storage.add(someTC);
    expect(storage.get('validType')).toBe(someTC);
  });

  it('should implements `has` method`', () => {
    const storage = new SchemaComposer();
    const someTC = storage.TypeComposer.create({ name: 'validType' });
    storage.add(someTC);
    expect(storage.has('validType')).toBe(true);
    expect(storage.has('unexistedType')).toBe(false);
  });

  describe('buildSchema()', () => {
    it('should throw error, if root fields not defined', () => {
      const storage = new SchemaComposer();
      storage.clear();

      expect(() => {
        storage.buildSchema();
      }).toThrowError();
    });
  });

  describe('removeEmptyTypes()', () => {
    it('should remove fields with Types which have no fields', () => {
      const storage = new SchemaComposer();
      const typeWithoutFieldsTC = storage.getOrCreateTC('Stub');
      typeWithoutFieldsTC.setFields({});

      const viewerTC = storage.getOrCreateTC('Viewer');
      viewerTC.setFields({
        name: 'String',
        stub: typeWithoutFieldsTC,
      });

      /* eslint-disable */
      const oldConsoleLog = console.log;
      global.console.log = jest.fn();

      storage.removeEmptyTypes(viewerTC);

      expect(console.log).lastCalledWith(
        "GQC: Delete field 'Viewer.stub' with type 'Stub', cause it does not have fields.",
      );
      global.console.log = oldConsoleLog;
      /* eslint-enable */

      expect(viewerTC.hasField('stub')).toBe(false);
    });

    it('should not produce Maximum call stack size exceeded', () => {
      const storage = new SchemaComposer();
      const userTC = storage.getOrCreateTC('User');
      userTC.setField('friend', userTC);

      storage.removeEmptyTypes(userTC);
    });
  });
});
