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
      // $FlowFixMe
      storage.add(errTypeObj1);
    }).toThrowError();

    const errTypeObj2 = { name: '123' };
    expect(() => {
      // $FlowFixMe
      storage.add(errTypeObj2);
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

  describe('buildRelations()', () => {
    let UserTC;
    let ArticleTC;
    let storage;

    beforeEach(() => {
      storage = new Storage();

      UserTC = TypeComposer.create(`
        type User {
          id: Int,
          name: String,
        }
      `);
      UserTC.addResolver({
        name: 'findById',
        type: UserTC,
        resolve: () => null,
      });

      ArticleTC = TypeComposer.create(`
        type Article {
          id: Int,
          userId: Int,
          title: String,
        }
      `);
      ArticleTC.addResolver({
        name: 'findOne',
        type: ArticleTC,
        resolve: () => null,
      });
    });

    it('should convert simple relation to fieldConfig', () => {
      ArticleTC.addRelation('user', () => ({
        resolver: UserTC.getResolver('findById'),
      }));
      expect(ArticleTC.getField('user')).toBeUndefined();
      storage.rootQuery().setField('acticles', ArticleTC);
      storage.buildSchema();
      expect(ArticleTC.getField('user').type.name).toBe('User');
    });

    it('should convert cross related relations to fieldConfigs', () => {
      ArticleTC.addRelation('user', () => ({
        resolver: UserTC.getResolver('findById'),
      }));

      UserTC.addRelation('lastArticle', () => ({
        resolver: ArticleTC.getResolver('findOne'),
      }));

      expect(ArticleTC.getField('user')).toBeUndefined();
      expect(UserTC.getField('lastArticle')).toBeUndefined();

      storage.rootQuery().setField('acticle', ArticleTC);
      storage.rootQuery().setField('user', UserTC);
      storage.buildSchema();
      expect(ArticleTC.getField('user').type.name).toBe('User');
      expect(UserTC.getField('lastArticle').type.name).toBe('Article');
    });

    it('should convert relations in relation to fieldConfigs', () => {
      ArticleTC.addRelation('user', () => ({
        resolver: UserTC.getResolver('findById'),
      }));

      UserTC.addRelation('lastArticle', () => ({
        resolver: ArticleTC.getResolver('findOne'),
      }));

      expect(ArticleTC.getField('user')).toBeUndefined();
      expect(UserTC.getField('lastArticle')).toBeUndefined();

      storage.rootQuery().setField('acticle', ArticleTC);
      // we not add UserTC to schema explicitly
      storage.buildSchema();
      expect(ArticleTC.getField('user').type.name).toBe('User');
      expect(UserTC.getField('lastArticle').type.name).toBe('Article');
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
      // $FlowFixMe
      console.log = jest.fn();

      storage.removeEmptyTypes(viewerTC);

      expect(console.log).lastCalledWith(
        "GQC: Delete field 'Viewer.stub' with type 'Stub', cause it does not have fields.",
      );
      // $FlowFixMe
      console.log = oldConsoleLog;
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
