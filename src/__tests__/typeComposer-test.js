/* @flow */

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
  let tc: TypeComposer;

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
      expect(fieldNames).toEqual(expect.arrayContaining(['field1', 'field2']));

      const tc2 = TypeComposer.create('SomeType');
      expect(tc2.getFields()).toEqual({});
    });

    describe('getField()', () => {
      it('should return field config', () => {
        expect(tc.getField('field1').type).toBe(GraphQLString);
      });

      it('should throw error if field does not exist', () => {
        expect(() => tc.getField('unexisted')).toThrowError(/Cannot get field.*does not exist/);
      });
    });

    describe('setFields()', () => {
      it('should add field with standart config', () => {
        tc.setFields({
          field3: { type: GraphQLString },
        });
        const fields = objectType.getFields();
        expect(Object.keys(fields)).toContain('field3');
        expect(fields.field3.type).toBe(GraphQLString);
      });

      it('should add fields with converting types from string to object', () => {
        tc.setFields({
          field3: { type: 'String' },
          field4: { type: '[Int]' },
          field5: 'Boolean!',
        });

        expect(tc.getField('field3').type).toBe(GraphQLString);
        expect(tc.getField('field4').type).toBeInstanceOf(GraphQLList);
        // $FlowFixMe
        expect(tc.getField('field4').type.ofType).toBe(GraphQLInt);
        expect(tc.getField('field5').type).toBeInstanceOf(GraphQLNonNull);
        // $FlowFixMe
        expect(tc.getField('field5').type.ofType).toBe(GraphQLBoolean);
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

        expect(tc.getFieldArg('field3', 'arg1').type).toBeInstanceOf(GraphQLNonNull);
        // $FlowFixMe
        expect(tc.getFieldArg('field3', 'arg1').type.ofType).toBe(GraphQLString);
        expect(tc.getFieldArg('field3', 'arg2').type).toBeInstanceOf(GraphQLList);
        // $FlowFixMe
        expect(tc.getFieldArg('field3', 'arg2').type.ofType).toBe(GraphQLFloat);
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

        expect(tc.getProjectionMapper()).toEqual({
          field3: { field1: true, field2: true },
          field5: { field4: true },
        });
      });

      it('accept types as function', () => {
        const typeAsFn = () => GraphQLString;
        tc.setFields({
          input3: { type: typeAsFn },
        });
        expect(tc.getFieldType('input3')).toBe(typeAsFn);

        // show provide unwrapped/unhoisted type for graphql
        // $FlowFixMe
        expect(tc.getType()._typeConfig.fields().input3.type).toBe(GraphQLString);
      });

      it('accept fieldConfig as function', () => {
        tc.setFields({
          input4: () => ({ type: 'String' }),
        });
        // show provide unwrapped/unhoisted type for graphql
        // $FlowFixMe
        expect(tc.getType()._typeConfig.fields().input4.type).toBe(GraphQLString);
      });
    });

    it('addFields()', () => {
      tc.addFields({
        field3: { type: GraphQLString },
        field4: { type: '[Int]' },
        field5: 'Boolean!',
      });
      expect(tc.getField('field3').type).toBe(GraphQLString);
      expect(tc.getField('field4').type).toBeInstanceOf(GraphQLList);
      // $FlowFixMe
      expect(tc.getField('field4').type.ofType).toBe(GraphQLInt);
      expect(tc.getField('field5').type).toBeInstanceOf(GraphQLNonNull);
      // $FlowFixMe
      expect(tc.getField('field5').type.ofType).toBe(GraphQLBoolean);
    });

    describe('removeField()', () => {
      it('should remove one field', () => {
        tc.removeField('field1');
        expect(tc.getFieldNames()).toEqual(expect.arrayContaining(['field2']));
      });

      it('should remove list of fields', () => {
        tc.removeField(['field1', 'field2']);
        expect(tc.getFieldNames()).toEqual(expect.arrayContaining([]));
      });
    });

    describe('removeOtherFields()', () => {
      it('should remove one field', () => {
        tc.removeOtherFields('field1');
        expect(tc.getFieldNames()).not.toEqual(expect.arrayContaining(['field2']));
        expect(tc.getFieldNames()).toEqual(expect.arrayContaining(['field1']));
      });

      it('should remove list of fields', () => {
        tc.setField('field3', 'String');
        tc.removeOtherFields(['field1', 'field2']);
        expect(tc.getFieldNames()).toEqual(expect.arrayContaining(['field1', 'field2']));
        expect(tc.getFieldNames()).not.toEqual(expect.arrayContaining(['field3']));
      });
    });

    describe('reorderFields()', () => {
      it('should change fields order', () => {
        tc.setFields({ f1: 'Int', f2: 'Int', f3: 'Int' });
        expect(tc.getFieldNames().join(',')).toBe('f1,f2,f3');
        tc.reorderFields(['f3', 'f2', 'f1']);
        expect(tc.getFieldNames().join(',')).toBe('f3,f2,f1');
      });

      it('should append not listed fields', () => {
        tc.setFields({ f1: 'Int', f2: 'Int', f3: 'Int' });
        expect(tc.getFieldNames().join(',')).toBe('f1,f2,f3');
        tc.reorderFields(['f3']);
        expect(tc.getFieldNames().join(',')).toBe('f3,f1,f2');
      });

      it('should skip non existed fields', () => {
        tc.setFields({ f1: 'Int', f2: 'Int', f3: 'Int' });
        expect(tc.getFieldNames().join(',')).toBe('f1,f2,f3');
        tc.reorderFields(['f22', 'f3', 'f55', 'f1', 'f2']);
        expect(tc.getFieldNames().join(',')).toBe('f3,f1,f2');
      });
    });

    describe('field arguments', () => {
      beforeEach(() => {
        tc.extendField('field1', {
          args: {
            arg1: 'Int',
            arg2: 'String',
          },
        });
      });

      it('getFieldArgs()', () => {
        const args = tc.getFieldArgs('field1');
        expect(Object.keys(args)).toEqual(['arg1', 'arg2']);
        expect(args.arg1.type).toBe(GraphQLInt);
        expect(() => tc.getFieldArgs('unexistedField')).toThrow();
      });

      it('hasFieldArg()', () => {
        expect(tc.hasFieldArg('field1', 'arg1')).toBeTruthy();
        expect(tc.hasFieldArg('field1', 'arg222')).toBeFalsy();
        expect(() => tc.hasFieldArg('unexistedField', 'arg1')).toThrow();
      });

      it('getFieldArg()', () => {
        expect(tc.getFieldArg('field1', 'arg1')).toBeTruthy();
        expect(() => tc.getFieldArg('field1', 'arg222')).toThrow(
          /Cannot get arg.*Argument does not exist/
        );
        expect(() => tc.hasFieldArg('unexistedField', 'arg1')).toThrow();
      });
    });

    describe('extendField()', () => {
      it('should extend existed fields', () => {
        tc.setField('field3', {
          type: GraphQLString,
          projection: { field1: true, field2: true },
        });
        tc.extendField('field3', {
          description: 'this is field #3',
        });
        expect(tc.getField('field3').type).toBe(GraphQLString);
        expect(tc.getField('field3').description).toBe('this is field #3');
        tc.extendField('field3', {
          type: 'Int',
        });
        expect(tc.getField('field3').type).toBe(GraphQLInt);
      });

      it('should throw error if field does not exists', () => {
        expect(() => tc.extendField('unexisted', { description: '123' })).toThrow(
          /Cannot extend field.*Field does not exist/
        );
      });

      it('should throw error if field declared as function', () => {
        tc.setField('hoistedField', () => ({
          type: 'String', // type may be imported from another module
        }));
        expect(() => tc.extendField('hoistedField', { description: '123' })).toThrow(
          /Cannot extend field.*FieldConfig declared as a function/
        );
      });
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
      expect(tc.getInterfaces()).toEqual(expect.arrayContaining([iface]));
    });

    it('hasInterface()', () => {
      tc.gqType._typeConfig.interfaces = [iface];
      expect(tc.hasInterface(iface)).toBe(true);
    });

    it('addInterface()', () => {
      tc.addInterface(iface);
      expect(tc.getInterfaces()).toEqual(expect.arrayContaining([iface]));
      expect(tc.hasInterface(iface)).toBe(true);
      tc.addInterface(iface2);
      expect(tc.getInterfaces()).toEqual(expect.arrayContaining([iface, iface2]));
      expect(tc.hasInterface(iface2)).toBe(true);
    });

    it('removeInterface()', () => {
      tc.addInterface(iface);
      tc.addInterface(iface2);
      expect(tc.getInterfaces()).toEqual(expect.arrayContaining([iface, iface2]));
      tc.removeInterface(iface);
      expect(tc.hasInterface(iface)).toBe(false);
      expect(tc.hasInterface(iface2)).toBe(true);
    });
  });

  describe('create() [static method]', () => {
    it('should create TC by typeName as a string', () => {
      const myTC = TypeComposer.create('TypeStub');
      expect(myTC).toBeInstanceOf(TypeComposer);
      expect(myTC.getType()).toBeInstanceOf(GraphQLObjectType);
      expect(myTC.getFields()).toEqual({});
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
      expect(myTC).toBeInstanceOf(TypeComposer);
      expect(myTC.getTypeName()).toBe('TestTypeTpl');
      expect(myTC.getFieldType('f1')).toBe(GraphQLString);
      expect(myTC.getFieldType('f2')).toBeInstanceOf(GraphQLNonNull);
      // $FlowFixMe
      expect(myTC.getFieldType('f2').ofType).toBe(GraphQLInt);
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
      expect(myTC).toBeInstanceOf(TypeComposer);
      expect(myTC.getFieldType('f1')).toBe(GraphQLString);
      expect(myTC.getFieldType('f2')).toBeInstanceOf(GraphQLNonNull);
      // $FlowFixMe
      expect(myTC.getFieldType('f2').ofType).toBe(GraphQLInt);
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
      expect(myTC).toBeInstanceOf(TypeComposer);
      expect(myTC.getType()).toBe(objType);
      expect(myTC.getFieldType('f1')).toBe(GraphQLString);
    });
  });

  describe('clone()', () => {
    it('should clone projection for fields', () => {
      tc.setField('field3', {
        type: GraphQLString,
        projection: { field1: true, field2: true },
      });

      const tc2 = tc.clone('newObject');
      expect(tc2.getProjectionMapper()).toEqual({
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

      expect(myTC.get('field1')).toBe(GraphQLString);
      expect(myTC.get('field1.@arg1')).toBe(GraphQLInt);
    });
  });

  describe('Resolvers manipulation', () => {
    it('addResolver() should accept Resolver instance', () => {
      const resolver = new Resolver({
        name: 'myResolver',
      });
      tc.addResolver(resolver);
      expect(tc.getResolver('myResolver')).toBe(resolver);
      expect(tc.hasResolver('myResolver')).toBe(true);
      expect(tc.hasResolver('myResolverXXX')).toBe(false);
    });

    it('addResolver() should accept Resolver options and create instance', () => {
      const resolverOpts = {
        name: 'myResolver2',
      };
      tc.addResolver(resolverOpts);
      expect(tc.getResolver('myResolver2')).toBeInstanceOf(Resolver);
      expect(tc.getResolver('myResolver2').name).toBe('myResolver2');
    });

    it('removeResolver() should work', () => {
      const resolver = new Resolver({
        name: 'myResolver3',
      });
      tc.addResolver(resolver);
      expect(tc.hasResolver('myResolver3')).toBe(true);
      tc.removeResolver('myResolver3');
      expect(tc.hasResolver('myResolver3')).toBe(false);
      expect(() => tc.getResolver('myResolver3')).toThrowError(
        /does not have resolver with name 'myResolver3'/
      );
    });

    it('setResolver() should add resolver with specific name', () => {
      const resolver = new Resolver({
        name: 'myResolver4',
      });
      tc.setResolver('specName4', resolver);
      expect(tc.hasResolver('specName4')).toBe(true);
      expect(tc.hasResolver('myResolver4')).toBe(false);
    });

    it('getResolvers() should return Map', () => {
      expect(tc.getResolvers()).toBeInstanceOf(Map);
      tc.addResolver({
        name: 'myResolver5',
      });
      expect(Array.from(tc.getResolvers().keys())).toContain('myResolver5');
    });

    it('wrapResolver() should wrap resolver resolve method', async () => {
      tc.addResolver({
        name: 'findById',
        resolve: () => '123',
      });
      expect(await tc.getResolver('findById').resolve({})).toBe('123');

      tc.wrapResolver('findById', next => async rp => {
        const prev = await next(rp);
        return `${prev}456`;
      });
      expect(await tc.getResolver('findById').resolve({})).toBe('123456');
    });

    it('wrapResolver() should return new resolver', async () => {
      tc.addResolver({
        name: 'updateById',
        resolve: () => '123',
      });
      expect(await tc.getResolver('updateById').resolve({})).toBe('123');

      const prevResolver = tc.getResolver('updateById');
      const newResolver = tc.wrapResolver('updateById');
      expect(newResolver).not.toBe(prevResolver);
      expect(await tc.getResolver('updateById').resolve({})).toBe('123');
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

      ArticleTC.addResolver({
        name: 'findOne',
        type: ArticleTC,
        resolve: () => null,
      });
    });

    describe('_relationWithResolverToFC()', () => {
      it('should return FieldConfig', () => {
        const fc = ArticleTC._relationWithResolverToFC({
          resolver: UserTC.getResolver('findById'),
        });
        expect(fc.type.name).toBe('User');
      });

      it('should accept resolver as thunk and return FieldConfig', () => {
        const fc = ArticleTC._relationWithResolverToFC({
          resolver: () => UserTC.getResolver('findById'),
        });
        expect(fc.type.name).toBe('User');
      });

      it('should throw error if provided incorrect Resolver instance', () => {
        expect(() =>
          ArticleTC._relationWithResolverToFC({
            resolver: ('abc': any),
          })
        ).toThrowError(/provide correct Resolver/);
      });

      it('should throw error if provided `type` property', () => {
        expect(() =>
          ArticleTC._relationWithResolverToFC({
            resolver: UserTC.getResolver('findById'),
            type: GraphQLInt,
          })
        ).toThrowError(/use `resolver` and `type`/);
      });

      it('should throw error if provided `resolve` property', () => {
        expect(() =>
          ArticleTC._relationWithResolverToFC({
            resolver: UserTC.getResolver('findById'),
            resolve: () => {},
          })
        ).toThrowError(/use `resolver` and `resolve`/);
      });
    });

    describe('thunk with Resolver', () => {
      it('should convert simple relation to fieldConfig', () => {
        ArticleTC.addRelation('user', {
          resolver: UserTC.getResolver('findById'),
        });
        const fc = ArticleTC.getType().getFields().user;
        // $FlowFixMe
        expect(fc.type.name).toBe('User');
      });

      it('should convert simple relation to fieldConfig with resolver thunk', () => {
        ArticleTC.addRelation('user', {
          resolver: () => UserTC.getResolver('findById'),
        });
        const fc = ArticleTC.getType().getFields().user;
        // $FlowFixMe
        expect(fc.type.name).toBe('User');
      });

      it('should convert unthunked simple relation to fieldConfig with resolver thunk', () => {
        ArticleTC.addRelation('user', {
          resolver: () => UserTC.getResolver('findById'),
        });
        const fc = ArticleTC.getType().getFields().user;
        // $FlowFixMe
        expect(fc.type.name).toBe('User');
      });

      it('should convert cross related relations to fieldConfigs', () => {
        ArticleTC.addRelation('user', {
          resolver: UserTC.getResolver('findById'),
        });

        UserTC.addRelation('lastArticle', {
          resolver: ArticleTC.getResolver('findOne'),
        });

        const fc1 = ArticleTC.getType().getFields().user;
        // $FlowFixMe
        expect(fc1.type.name).toBe('User');

        const fc2 = UserTC.getType().getFields().lastArticle;
        // $FlowFixMe
        expect(fc2.type.name).toBe('Article');
      });
    });

    describe('thunk with FieldConfig', () => {
      it('should create field via buildRelations()', () => {
        ArticleTC.addRelation('user', {
          type: UserTC,
          resolve: () => {},
        });

        const fc = ArticleTC.getType().getFields().user;
        expect(fc.type).toBeInstanceOf(GraphQLObjectType);
        // $FlowFixMe
        expect(fc.type.name).toBe('User');
      });
    });
  });

  describe('get type methods', () => {
    it('getTypePlural() should return wrapped type in GraphQLList', () => {
      expect(tc.getTypePlural()).toBeInstanceOf(GraphQLList);
      expect(tc.getTypePlural().ofType).toBe(tc.getType());
    });
  });

  it('should have chainable methods', () => {
    expect(tc.setFields({})).toBe(tc);
    expect(tc.setField('f1', { type: 'Int' })).toBe(tc);
    expect(tc.extendField('f1', { description: 'Ok' })).toBe(tc);
    expect(tc.deprecateFields('f1')).toBe(tc);
    expect(tc.addFields({})).toBe(tc);
    expect(tc.removeField('f1')).toBe(tc);
    expect(tc.removeOtherFields('f1')).toBe(tc);
    expect(tc.reorderFields(['f1'])).toBe(tc);

    expect(tc.addRelation('user', ({}: any))).toBe(tc);

    expect(tc.setInterfaces(([1, 2]: any))).toBe(tc);
    expect(tc.addInterface((1: any))).toBe(tc);
    expect(tc.removeInterface((2: any))).toBe(tc);

    expect(tc.setResolver('myResolver', new Resolver({ name: 'myResolver' }))).toBe(tc);
    expect(tc.addResolver(new Resolver({ name: 'myResolver' }))).toBe(tc);
    expect(tc.removeResolver('myResolver')).toBe(tc);

    expect(tc.setTypeName('Type2')).toBe(tc);
    expect(tc.setDescription('Description')).toBe(tc);
    expect(tc.setRecordIdFn(() => ({}: any))).toBe(tc);
    expect(tc.addProjectionMapper('f1', { name: true })).toBe(tc);
  });

  describe('deprecateFields()', () => {
    let tc1;

    beforeEach(() => {
      tc1 = TypeComposer.create(`
        type MyType {
          name: String
          age: Int
          dob: Date
        }
        `);
    });

    it('should accept string', () => {
      tc1.deprecateFields('name');
      expect(tc1.getField('name').deprecationReason).toBe('deprecated');
      expect(tc1.getField('age').deprecationReason).toBeUndefined();
      expect(tc1.getField('dob').deprecationReason).toBeUndefined();
    });

    it('should accept array of string', () => {
      tc1.deprecateFields(['name', 'age']);
      expect(tc1.getField('name').deprecationReason).toBe('deprecated');
      expect(tc1.getField('age').deprecationReason).toBe('deprecated');
      expect(tc1.getField('dob').deprecationReason).toBeUndefined();
    });

    it('should accept object with fields and reasons', () => {
      tc1.deprecateFields({
        age: 'dont use',
        dob: 'old field',
      });
      expect(tc1.getField('name').deprecationReason).toBeUndefined();
      expect(tc1.getField('age').deprecationReason).toBe('dont use');
      expect(tc1.getField('dob').deprecationReason).toBe('old field');
    });

    it('should throw error on unexisted field', () => {
      expect(() => {
        tc1.deprecateFields('unexisted');
      }).toThrowError(/Cannot deprecate unexisted field/);

      expect(() => {
        tc1.deprecateFields(['unexisted']);
      }).toThrowError(/Cannot deprecate unexisted field/);

      expect(() => {
        tc1.deprecateFields({ unexisted: 'Deprecate reason' });
      }).toThrowError(/Cannot deprecate unexisted field/);
    });
  });

  describe('getFieldTC()', () => {
    const myTC = TypeComposer.create('MyCustomType');
    myTC.addFields({
      scalar: 'String',
      list: '[Int]',
      obj: TypeComposer.create(`type MyCustomObjType { name: String }`),
      objArr: [TypeComposer.create(`type MyCustomObjType2 { name: String }`)],
    });

    it('should return TypeComposer for object field', () => {
      const objTC = myTC.getFieldTC('obj');
      expect(objTC.getTypeName()).toBe('MyCustomObjType');
    });

    it('should return TypeComposer for wrapped object field', () => {
      const objTC = myTC.getFieldTC('objArr');
      expect(objTC.getTypeName()).toBe('MyCustomObjType2');
    });

    it('should throw error for non-object fields', () => {
      expect(() => {
        myTC.getFieldTC('scalar');
      }).toThrow('field should be ObjectType');

      expect(() => {
        myTC.getFieldTC('list');
      }).toThrow('field should be ObjectType');
    });
  });
});
