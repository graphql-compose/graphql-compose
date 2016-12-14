import { expect } from 'chai';
import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLInterfaceType,
} from 'graphql';
import TypeComposer from '../typeComposer';
import Resolver from '../resolver';


describe('TypeComposer', () => {
  let objectType;
  let tc;

  beforeEach(() => {
    objectType = new GraphQLObjectType({
      name: 'Readable',
      fields: {
        field1: { type: GraphQLString },
        field2: { type: GraphQLString },
      },
    });

    tc = new TypeComposer(objectType);
  });

  describe('fields manipulation', () => {
    it('should has `getFields` method', () => {
      const fieldNames = Object.keys(tc.getFields());
      expect(fieldNames).to.have.members(['field1', 'field2']);

      const tc2 = TypeComposer.create('SomeType');
      expect(tc2.getFields()).to.deep.equal({});
    });


    it('should has `addFields` method', () => {
      tc.setField('field3', { type: GraphQLString });
      const fieldNames = Object.keys(objectType.getFields());
      expect(fieldNames).to.include('field3');
    });


    it('should add fields with converting types from string to object', () => {
      tc.setField('field3', { type: 'String' });
      tc.addFields({
        field4: { type: '[Int]' },
        field5: { type: 'Boolean!' },
      });

      expect(tc.getField('field3').type).to.equal(GraphQLString);
      expect(tc.getField('field4').type).instanceof(GraphQLList);
      expect(tc.getField('field4').type.ofType).to.equal(GraphQLInt);
      expect(tc.getField('field5').type).instanceof(GraphQLNonNull);
      expect(tc.getField('field5').type.ofType).to.equal(GraphQLBoolean);
    });


    it('should add fields with converting args types from string to object', () => {
      tc.setField('field3', {
        type: 'String',
        args: {
          arg1: { type: 'String!' },
          arg2: '[Float]',
        },
      });

      expect(tc.getFieldArg('field3', 'arg1').type).instanceof(GraphQLNonNull);
      expect(tc.getFieldArg('field3', 'arg1').type.ofType).to.equal(GraphQLString);
      expect(tc.getFieldArg('field3', 'arg2').type).instanceof(GraphQLList);
      expect(tc.getFieldArg('field3', 'arg2').type.ofType).to.equal(GraphQLFloat);
    });


    it('should add projection via `setField` and `addFields`', () => {
      tc.setField('field3', {
        type: GraphQLString,
        projection: { field1: true, field2: true },
      });
      tc.addFields({
        field4: { type: GraphQLString },
        field5: { type: GraphQLString, projection: { field4: true } },
      });

      expect(tc.getProjectionMapper()).to.deep.equal({
        field3: { field1: true, field2: true },
        field5: { field4: true },
      });
    });


    it('should clone projection for fields', () => {
      tc.setField('field3', {
        type: GraphQLString,
        projection: { field1: true, field2: true },
      });

      const tc2 = tc.clone('newObject');
      expect(tc2.getProjectionMapper()).to.deep.equal({
        field3: { field1: true, field2: true },
      });
    });

    it('should remove one field', () => {
      tc.removeField('field1');
      expect(tc.getFieldNames()).to.have.members(['field2']);
    });

    it('should remove list of fields', () => {
      tc.removeField(['field1', 'field2']);
      expect(tc.getFieldNames()).to.have.members([]);
    });

    it('should extend field by name', () => {
      tc.setField('field3', {
        type: GraphQLString,
        projection: { field1: true, field2: true },
      });
      tc.extendField('field3', {
        description: 'this is field #3',
      });
      expect(tc.getField('field3')).property('type').to.be.equal(GraphQLString);
      expect(tc.getField('field3')).property('description').to.equal('this is field #3');
      tc.extendField('field3', {
        type: 'Int',
      });
      expect(tc.getField('field3')).property('type').to.be.equal(GraphQLInt);
    });
  });

  describe('interfaces manipulation', () => {
    it('should has `getInterfaces` method', () => {
      expect(tc.getInterfaces()).to.have.members([]);
    });


    it('should has working `addInterface`, `hasInterface`, `removeInterface` methods', () => {
      const iface = new GraphQLInterfaceType({
        name: 'Node',
        description: '',
        fields: () => ({}),
        resolveType: () => {},
      });
      tc.addInterface(iface);
      expect(tc.getInterfaces()).to.have.members([iface]);
      expect(tc.hasInterface(iface)).to.be.true;
      const iface2 = new GraphQLInterfaceType({
        name: 'Node',
        description: '',
        fields: () => ({}),
        resolveType: () => {},
      });
      tc.addInterface(iface2);
      expect(tc.getInterfaces()).to.have.members([iface, iface2]);
      expect(tc.hasInterface(iface2)).to.be.true;

      tc.removeInterface(iface);
      expect(tc.hasInterface(iface)).to.be.false;
      expect(tc.hasInterface(iface2)).to.be.true;
    });

    it('should remove interface', () => {
      tc.removeField('field1');
      expect(tc.getFieldNames()).to.have.members(['field2']);
    });
  });

  describe('create() [static method]', () => {
    it('should create TC by typeName as a string', () => {
      const myTC = TypeComposer.create('TypeStub');
      expect(myTC).instanceof(TypeComposer);
      expect(myTC.getType()).instanceof(GraphQLObjectType);
      expect(myTC.getFields()).deep.equal({});
    });

    it('should create TC by type template string', () => {
      const myTC = TypeComposer.create(`
        type TestTypeTpl {
          f1: String
          # Description for some required Int field
          f2: Int!
        }
      `);
      expect(myTC).instanceof(TypeComposer);
      expect(myTC.getTypeName()).equal('TestTypeTpl');
      expect(myTC.getFieldType('f1')).equal(GraphQLString);
      expect(myTC.getFieldType('f2')).instanceof(GraphQLNonNull);
      expect(myTC.getFieldType('f2').ofType).equal(GraphQLInt);
    });

    it('should create TC by GraphQLObjectTypeConfig', () => {
      const myTC = TypeComposer.create({
        name: 'TestType',
        fields: {
          f1: {
            type: 'String',
          },
          f2: 'Int!',
        },
      });
      expect(myTC).instanceof(TypeComposer);
      expect(myTC.getFieldType('f1')).equal(GraphQLString);
      expect(myTC.getFieldType('f2')).instanceof(GraphQLNonNull);
      expect(myTC.getFieldType('f2').ofType).equal(GraphQLInt);
    });

    it('should create TC by GraphQLObjectType', () => {
      const objType = new GraphQLObjectType({
        name: 'TestTypeObj',
        fields: {
          f1: {
            type: GraphQLString,
          },
        },
      });
      const myTC = TypeComposer.create(objType);
      expect(myTC).instanceof(TypeComposer);
      expect(myTC.getType()).equal(objType);
      expect(myTC.getFieldType('f1')).equal(GraphQLString);
    });
  });

  describe('get()', () => {
    it('should return type by path', () => {
      const myTC = new TypeComposer(new GraphQLObjectType({
        name: 'Readable',
        fields: {
          field1: {
            type: GraphQLString,
            args: {
              arg1: {
                type: GraphQLInt,
              },
            },
          },
        },
      }));

      expect(myTC.get('field1')).equal(GraphQLString);
      expect(myTC.get('field1.@arg1')).equal(GraphQLInt);
    });
  });

  describe('Resolvers manipulation', () => {
    it('addResolver() should accept Resolver instance', () => {
      const resolver = new Resolver({
        name: 'myResolver',
      });
      tc.addResolver(resolver);
      expect(tc.getResolver('myResolver')).equal(resolver);
      expect(tc.hasResolver('myResolver')).to.be.true;
      expect(tc.hasResolver('myResolverXXX')).to.be.false;
    });

    it('addResolver() should accept Resolver options and create instance', () => {
      const resolverOpts = {
        name: 'myResolver2',
      };
      tc.addResolver(resolverOpts);
      expect(tc.getResolver('myResolver2')).instanceof(Resolver);
      expect(tc.getResolver('myResolver2').name).equal('myResolver2');
    });

    it('removeResolver() should work', () => {
      const resolver = new Resolver({
        name: 'myResolver3',
      });
      tc.addResolver(resolver);
      expect(tc.hasResolver('myResolver3')).to.be.true;
      tc.removeResolver('myResolver3');
      expect(tc.hasResolver('myResolver3')).to.be.false;
      expect(tc.getResolver('myResolver3')).to.be.undefined;
    });

    it('setResolver() should add resolver with specific name', () => {
      const resolver = new Resolver({
        name: 'myResolver4',
      });
      tc.setResolver('specName4', resolver);
      expect(tc.hasResolver('specName4')).to.be.true;
      expect(tc.hasResolver('myResolver4')).to.be.false;
    });

    it('getResolvers() should return Map', () => {
      expect(tc.getResolvers()).instanceof(Map);
      tc.addResolver({
        name: 'myResolver5',
      });
      expect(
        Array.from(tc.getResolvers().keys())
      ).include('myResolver5');
    });
  });

  describe('addRelation()', () => {
    let UserTC;
    let ArticleTC;

    beforeEach(() => {
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
    });

    describe('thunk with Resolver', () => {
      it('should create field via buildRelations()', () => {
        ArticleTC.addRelation(
          'user',
          () => ({
            resolver: UserTC.getResolver('findById'),
          })
        );
        expect(ArticleTC.getField('user')).to.be.undefined;
        ArticleTC.buildRelations();
        expect(ArticleTC.getField('user').type.name).to.equal('User');
      });

      it('should throw error if provided incorrect Resolver instance', () => {
        ArticleTC.addRelation(
          'user',
          () => ({
            resolver: 'abc',
          })
        );
        expect(() => { ArticleTC.buildRelations(); }).throw(/provide correct Resolver/);
      });

      it('should throw error if provided `type` property', () => {
        ArticleTC.addRelation(
          'user',
          () => ({
            resolver: UserTC.getResolver('findById'),
            type: GraphQLInt,
          })
        );
        expect(() => { ArticleTC.buildRelations(); }).throw(/use `resolver` and `type`/);
      });

      it('should throw error if provided `resolve` property', () => {
        ArticleTC.addRelation(
          'user',
          () => ({
            resolver: UserTC.getResolver('findById'),
            resolve: () => {},
          })
        );
        expect(() => { ArticleTC.buildRelations(); }).throw(/use `resolver` and `resolve`/);
      });
    });

    describe('thunk with FieldConfig', () => {
      it('should create field via buildRelations()', () => {
        ArticleTC.addRelation(
          'user',
          () => ({
            type: UserTC,
            resolve: () => {},
          })
        );
        expect(ArticleTC.getField('user')).to.be.undefined;
        ArticleTC.buildRelations();
        expect(ArticleTC.getField('user').type.name).to.equal('User');
      });
    });
  });

  describe('get type methods', () => {
    it('getTypePlural() should return wrapped type in GraphQLList', () => {
      expect(tc.getTypePlural()).instanceof(GraphQLList);
      expect(tc.getTypePlural().ofType).to.equal(tc.getType());
    });
  });
});
