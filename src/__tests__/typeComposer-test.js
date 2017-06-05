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
    it('getFields()', () => {
      const fieldNames = Object.keys(tc.getFields());
      expect(fieldNames).to.have.members(['field1', 'field2']);

      const tc2 = TypeComposer.create('SomeType');
      expect(tc2.getFields()).to.deep.equal({});
    });

    describe('setFields()', () => {
      it('should add field with standart config', () => {
        tc.setFields({
          field3: { type: GraphQLString },
        });
        const fields = objectType.getFields();
        expect(Object.keys(fields)).to.include('field3');
        expect(fields.field3.type).to.equal(GraphQLString);
      });

      it('should add fields with converting types from string to object', () => {
        tc.setFields({
          field3: { type: 'String' },
          field4: { type: '[Int]' },
          field5: 'Boolean!',
        });

        expect(tc.getField('field3').type).to.equal(GraphQLString);
        expect(tc.getField('field4').type).instanceof(GraphQLList);
        expect(tc.getField('field4').type.ofType).to.equal(GraphQLInt);
        expect(tc.getField('field5').type).instanceof(GraphQLNonNull);
        expect(tc.getField('field5').type.ofType).to.equal(GraphQLBoolean);
      });

      it('should add fields with converting args types from string to object', () => {
        tc.setFields({
          field3: {
            type: 'String',
            args: {
              arg1: { type: 'String!' },
              arg2: '[Float]',
            },
          },
        });

        expect(tc.getFieldArg('field3', 'arg1').type).instanceof(GraphQLNonNull);
        expect(tc.getFieldArg('field3', 'arg1').type.ofType).to.equal(GraphQLString);
        expect(tc.getFieldArg('field3', 'arg2').type).instanceof(GraphQLList);
        expect(tc.getFieldArg('field3', 'arg2').type.ofType).to.equal(GraphQLFloat);
      });

      it('should add projection via `setField` and `addFields`', () => {
        tc.setFields({
          field3: {
            type: GraphQLString,
            projection: { field1: true, field2: true },
          },
          field4: { type: GraphQLString },
          field5: { type: GraphQLString, projection: { field4: true } },
        });

        expect(tc.getProjectionMapper()).to.deep.equal({
          field3: { field1: true, field2: true },
          field5: { field4: true },
        });
      });

      it('accept types as function', () => {
        const typeAsFn = () => GraphQLString;
        tc.setFields({
          input3: { type: typeAsFn },
        });
        expect(tc.getFieldType('input3')).to.equal(typeAsFn);

        // show provide unwrapped/unhoisted type for graphql
        expect(tc.getType()._typeConfig.fields().input3.type).to.equal(GraphQLString);
      });

      it('accept fieldConfig as function', () => {
        tc.setFields({
          input4: () => ({ type: 'String' }),
        });
        // show provide unwrapped/unhoisted type for graphql
        expect(tc.getType()._typeConfig.fields().input4.type).to.equal(GraphQLString);
      });
    });

    it('addFields()', () => {
      tc.addFields({
        field3: { type: GraphQLString },
        field4: { type: '[Int]' },
        field5: 'Boolean!',
      });
      expect(tc.getField('field3').type).to.equal(GraphQLString);
      expect(tc.getField('field4').type).instanceof(GraphQLList);
      expect(tc.getField('field4').type.ofType).to.equal(GraphQLInt);
      expect(tc.getField('field5').type).instanceof(GraphQLNonNull);
      expect(tc.getField('field5').type.ofType).to.equal(GraphQLBoolean);
    });

    describe('removeField()', () => {
      it('should remove one field', () => {
        tc.removeField('field1');
        expect(tc.getFieldNames()).to.have.members(['field2']);
      });

      it('should remove list of fields', () => {
        tc.removeField(['field1', 'field2']);
        expect(tc.getFieldNames()).to.have.members([]);
      });
    });

    describe('removeOtherFields()', () => {
      it('should remove one field', () => {
        tc.removeOtherFields('field1');
        expect(tc.getFieldNames()).to.not.have.members(['field2']);
        expect(tc.getFieldNames()).to.have.members(['field1']);
      });

      it('should remove list of fields', () => {
        tc.setField('field3', 'String');
        tc.removeOtherFields(['field1', 'field2']);
        expect(tc.getFieldNames()).to.have.members(['field1', 'field2']);
        expect(tc.getFieldNames()).to.not.have.members(['field3']);
      });
    });

    describe('reorderFields()', () => {
      it('should change fields order', () => {
        tc.setFields({ f1: 'Int', f2: 'Int', f3: 'Int' });
        expect(tc.getFieldNames().join(',')).to.equal('f1,f2,f3');
        tc.reorderFields(['f3', 'f2', 'f1']);
        expect(tc.getFieldNames().join(',')).to.equal('f3,f2,f1');
      });

      it('should append not listed fields', () => {
        tc.setFields({ f1: 'Int', f2: 'Int', f3: 'Int' });
        expect(tc.getFieldNames().join(',')).to.equal('f1,f2,f3');
        tc.reorderFields(['f3']);
        expect(tc.getFieldNames().join(',')).to.equal('f3,f1,f2');
      });

      it('should skip non existed fields', () => {
        tc.setFields({ f1: 'Int', f2: 'Int', f3: 'Int' });
        expect(tc.getFieldNames().join(',')).to.equal('f1,f2,f3');
        tc.reorderFields(['f22', 'f3', 'f55', 'f1', 'f2']);
        expect(tc.getFieldNames().join(',')).to.equal('f3,f1,f2');
      });
    });

    it('extendField()', () => {
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
    const iface = new GraphQLInterfaceType({
      name: 'Node',
      description: '',
      fields: () => ({}),
      resolveType: () => {},
    });
    const iface2 = new GraphQLInterfaceType({
      name: 'Node',
      description: '',
      fields: () => ({}),
      resolveType: () => {},
    });

    it('getInterfaces()', () => {
      tc.gqType._typeConfig.interfaces = [iface];
      expect(tc.getInterfaces()).to.have.members([iface]);
    });

    it('hasInterface()', () => {
      tc.gqType._typeConfig.interfaces = [iface];
      expect(tc.hasInterface(iface)).to.be.true;
    });

    it('addInterface()', () => {
      tc.addInterface(iface);
      expect(tc.getInterfaces()).to.have.members([iface]);
      expect(tc.hasInterface(iface)).to.be.true;
      tc.addInterface(iface2);
      expect(tc.getInterfaces()).to.have.members([iface, iface2]);
      expect(tc.hasInterface(iface2)).to.be.true;
    });

    it('removeInterface()', () => {
      tc.addInterface(iface);
      tc.addInterface(iface2);
      expect(tc.getInterfaces()).to.have.members([iface, iface2]);
      tc.removeInterface(iface);
      expect(tc.hasInterface(iface)).to.be.false;
      expect(tc.hasInterface(iface2)).to.be.true;
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
      const myTC = TypeComposer.create(
        `
        type TestTypeTpl {
          f1: String
          # Description for some required Int field
          f2: Int!
        }
      `
      );
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

  describe('clone()', () => {
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
  });

  describe('get()', () => {
    it('should return type by path', () => {
      const myTC = new TypeComposer(
        new GraphQLObjectType({
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
        })
      );

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
      expect(() => tc.getResolver('myResolver3')).throw(
        /does not have resolver with name 'myResolver3'/
      );
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
      expect(Array.from(tc.getResolvers().keys())).include('myResolver5');
    });
  });

  describe('addRelation()', () => {
    let UserTC;
    let ArticleTC;

    beforeEach(() => {
      UserTC = TypeComposer.create(
        `
        type User {
          id: Int,
          name: String,
        }
      `
      );
      UserTC.addResolver({
        name: 'findById',
        type: UserTC,
        resolve: () => null,
      });

      ArticleTC = TypeComposer.create(
        `
        type Article {
          id: Int,
          userId: Int,
          title: String,
        }
      `
      );
    });

    describe('thunk with Resolver', () => {
      it('should create field via buildRelations()', () => {
        ArticleTC.addRelation('user', () => ({
          resolver: UserTC.getResolver('findById'),
        }));
        expect(ArticleTC.getField('user')).to.be.undefined;
        ArticleTC.buildRelations();
        expect(ArticleTC.getField('user').type.name).to.equal('User');
      });

      it('should throw error if provided incorrect Resolver instance', () => {
        ArticleTC.addRelation('user', () => ({
          resolver: 'abc',
        }));
        expect(() => {
          ArticleTC.buildRelations();
        }).throw(/provide correct Resolver/);
      });

      it('should throw error if provided `type` property', () => {
        ArticleTC.addRelation('user', () => ({
          resolver: UserTC.getResolver('findById'),
          type: GraphQLInt,
        }));
        expect(() => {
          ArticleTC.buildRelations();
        }).throw(/use `resolver` and `type`/);
      });

      it('should throw error if provided `resolve` property', () => {
        ArticleTC.addRelation('user', () => ({
          resolver: UserTC.getResolver('findById'),
          resolve: () => {},
        }));
        expect(() => {
          ArticleTC.buildRelations();
        }).throw(/use `resolver` and `resolve`/);
      });
    });

    describe('thunk with FieldConfig', () => {
      it('should create field via buildRelations()', () => {
        ArticleTC.addRelation('user', () => ({
          type: UserTC,
          resolve: () => {},
        }));
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

  it('should have chainable methods', () => {
    expect(tc.setFields({})).equal(tc);
    expect(tc.setField('f1', { type: 'Int' })).equal(tc);
    expect(tc.extendField('f1', {})).equal(tc);
    expect(tc.addFields({})).equal(tc);
    expect(tc.removeField('f1')).equal(tc);
    expect(tc.removeOtherFields('f1')).equal(tc);
    expect(tc.reorderFields(['f1'])).equal(tc);

    expect(tc.addRelation('user', () => ({}))).equal(tc);
    expect(tc.buildRelations()).equal(tc);
    expect(tc.buildRelation('user')).equal(tc);
    expect(
      tc.addRelationWithResolver('user', new Resolver({ name: 'myResolver', type: 'Int' }), {})
    ).equal(tc);

    expect(tc.setInterfaces([1, 2])).equal(tc);
    expect(tc.addInterface(1)).equal(tc);
    expect(tc.removeInterface(2)).equal(tc);

    expect(tc.setResolver('myResolver', new Resolver({ name: 'myResolver' }))).equal(tc);
    expect(tc.addResolver(new Resolver({ name: 'myResolver' }))).equal(tc);
    expect(tc.removeResolver('myResolver')).equal(tc);

    expect(tc.setTypeName('Type2')).equal(tc);
    expect(tc.setDescription('Description')).equal(tc);
    expect(tc.setRecordIdFn(() => {})).equal(tc);
    expect(tc.addProjectionMapper('f1', { name: true })).equal(tc);
  });
});
