/* @flow */

import Storage from '../storage';
import TypeComposer from '../typeComposer';

describe('Storage [Class]', () => {
  const someTC = TypeComposer.create({ name: 'validType' });

  it('should implements `add` method that accepts only TypeComposer', () => {
    const storage = new Storage();
    storage.add(someTC);
    expect(storage.get('validType')).toBe(someTC);

    const errTypeObj1 = {
      name: 'ValidType1',
    };
    expect(() => {
      storage.add((errTypeObj1: any));
    }).toThrowError();

    const errTypeObj2 = { name: '123' };
    expect(() => {
      storage.add((errTypeObj2: any));
    }).toThrowError();
  });

  it('should implements `get` method', () => {
    const storage = new Storage();
    storage.add(someTC);
    expect(storage.get('validType')).toBe(someTC);
  });

  it('should implements `has` method`', () => {
    const storage = new Storage();
    storage.add(someTC);
    expect(storage.has('validType')).toBe(true);
    expect(storage.has('unexistedType')).toBe(false);
  });

  describe('buildSchema()', () => {
    it('should throw error, if root fields not defined', () => {
      const storage = new Storage();
      storage.clear();

      expect(() => {
        storage.buildSchema();
      }).toThrowError();
    });
  });

  describe('removeEmptyTypes()', () => {
    it('should remove fields with Types which have no fields', () => {
      const storage = new Storage();
      const typeWithoutFieldsTC = storage.get('Stub');
      typeWithoutFieldsTC.setFields({});

      const viewerTC = storage.get('Viewer');
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
      const storage = new Storage();
      const userTC = storage.get('User');
      userTC.setField('friend', userTC);

      storage.removeEmptyTypes(userTC);
    });
  });
});
