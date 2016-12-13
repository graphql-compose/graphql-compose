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
    expect(storage.has('validType')).to.be.true;
    expect(storage.has('unexistedType')).to.be.false;
  });


  describe('buildSchema()', () => {
    it('should throw error, if root fields not defined', () => {
      const storage = new Storage();
      storage.clear();

      expect(() => { storage.buildSchema(); }).throw();
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
        outputType: UserTC,
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
        outputType: ArticleTC,
        resolve: () => null,
      });
    });

    it('should convert simple relation to fieldConfig', () => {
      ArticleTC.addRelation('user',
        () => ({
          resolver: UserTC.getResolver('findById'),
        })
      );
      expect(ArticleTC.getField('user')).to.be.undefined;
      storage.rootQuery().setField('acticles', ArticleTC);
      storage.buildSchema();
      expect(ArticleTC.getField('user').type.name).to.equal('User');
    });

    it('should convert cross related relations to fieldConfigs', () => {
      ArticleTC.addRelation('user',
        () => ({
          resolver: UserTC.getResolver('findById'),
        })
      );

      UserTC.addRelation('lastArticle',
        () => ({
          resolver: ArticleTC.getResolver('findOne'),
        })
      );

      expect(ArticleTC.getField('user')).to.be.undefined;
      expect(UserTC.getField('lastArticle')).to.be.undefined;

      storage.rootQuery().setField('acticle', ArticleTC);
      storage.rootQuery().setField('user', UserTC);
      storage.buildSchema();
      expect(ArticleTC.getField('user').type.name).to.equal('User');
      expect(UserTC.getField('lastArticle').type.name).to.equal('Article');
    });

    it('should convert relations in relations to fieldConfigs', () => {
      ArticleTC.addRelation('user',
        () => ({
          resolver: UserTC.getResolver('findById'),
        })
      );

      UserTC.addRelation('lastArticle',
        () => ({
          resolver: ArticleTC.getResolver('findOne'),
        })
      );

      expect(ArticleTC.getField('user')).to.be.undefined;
      expect(UserTC.getField('lastArticle')).to.be.undefined;

      storage.rootQuery().setField('acticle', ArticleTC);
      // we not add UserTC to schema explicitly
      storage.buildSchema();
      expect(ArticleTC.getField('user').type.name).to.equal('User');
      expect(UserTC.getField('lastArticle').type.name).to.equal('Article');
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

      storage.removeEmptyTypes(viewerTC);
      expect(viewerTC.hasField('stub')).to.be.false;
    });

    it('should not produce Maximum call stack size exceeded', () => {
      const storage = new Storage();
      const userTC = storage.get('User');
      userTC.setField('friend', userTC);

      storage.removeEmptyTypes(userTC);
    });
  });
});
