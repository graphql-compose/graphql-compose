/* @flow strict */

import {
  GraphQLList,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLUnionType,
  graphql,
} from '../graphql';
import { UnionTypeComposer, schemaComposer, TypeComposer } from '..';

beforeEach(() => {
  schemaComposer.clear();
});

describe('UnionTypeComposer', () => {
  let objectType: GraphQLUnionType;
  let utc: UnionTypeComposer;

  beforeEach(() => {
    objectType = new GraphQLUnionType({
      name: 'MyUnion',
      types: [
        new GraphQLObjectType({ name: 'A', fields: { a: { type: GraphQLInt } } }),
        new GraphQLObjectType({ name: 'B', fields: { b: { type: GraphQLInt } } }),
      ],
    });
    utc = new UnionTypeComposer(objectType);
  });

  describe('create() [static method]', () => {
    it('should create Union by typeName as a string', () => {
      const myUTC = UnionTypeComposer.create('UnionStub');
      expect(myUTC).toBeInstanceOf(UnionTypeComposer);
      expect(myUTC.getType()).toBeInstanceOf(GraphQLUnionType);
      expect(myUTC.getTypes()).toEqual([]);
    });

    it('should create Union by type template string', () => {
      const myUTC = UnionTypeComposer.create(`
        union TestTypeTpl = A | B
      `);
      expect(myUTC).toBeInstanceOf(UnionTypeComposer);
      expect(myUTC.getTypeName()).toBe('TestTypeTpl');

      // when types A & B are not defined getTypes() throw an error
      expect(() => myUTC.getTypes()).toThrowError("Cannot find type with name 'A'");

      // when types A & B defined, getTypes() returns them
      TypeComposer.create('type A { a: Int }');
      TypeComposer.create('type B { b: Int }');
      const types = myUTC.getTypes();
      expect(types).toHaveLength(2);
      expect(types[0]).toBeInstanceOf(GraphQLObjectType);
      expect(types[1]).toBeInstanceOf(GraphQLObjectType);
    });

    it('should create UTC by UnionTypeConfig', () => {
      const myUTC = UnionTypeComposer.create({
        name: 'TestType',
        types: () => [`type AA { a: Int }`, `BB`],
      });
      expect(myUTC).toBeInstanceOf(UnionTypeComposer);
      TypeComposer.create(`type BB { b: Int }`);
      const types = myUTC.getTypes();
      expect(types).toHaveLength(2);
      expect(types[0]).toBeInstanceOf(GraphQLObjectType);
      expect(types[1]).toBeInstanceOf(GraphQLObjectType);
    });

    it('should create UTC by GraphQLUnionType', () => {
      const objType = new GraphQLUnionType({
        name: 'TestTypeObj',
        types: [new GraphQLObjectType({ name: 'C', fields: () => ({}) })],
      });
      const myUTC = UnionTypeComposer.create(objType);
      expect(myUTC).toBeInstanceOf(UnionTypeComposer);
      expect(myUTC.getType()).toBe(objType);
      expect((myUTC.getTypes(): any)[0].name).toBe('C');
    });

    it('should create type and store it in schemaComposer', () => {
      const UserUnion = UnionTypeComposer.create('UserUnion');
      expect(schemaComposer.getUTC('UserUnion')).toBe(UserUnion);
    });

    it('createTemp() should not store type in schemaComposer', () => {
      UnionTypeComposer.createTemp('SomeUnion');
      expect(schemaComposer.has('SomeUnion')).toBeFalsy();
    });
  });

  describe('types manipulation', () => {
    it('getTypes()', () => {
      const types = utc.getTypes();
      expect(types).toHaveLength(2);
      expect(types[0]).toBeInstanceOf(GraphQLObjectType);
      expect(types[1]).toBeInstanceOf(GraphQLObjectType);
    });

    it('hasType()', () => {
      expect(utc.hasType('A')).toBeTruthy();
      expect(utc.hasType('B')).toBeTruthy();
      expect(utc.hasType('C')).toBeFalsy();
    });

    it('getTypeNames()', () => {
      const types = utc.getTypeNames();
      expect(types).toEqual(['A', 'B']);
    });

    describe('addType()', () => {
      it('should add GraphQLObjectType', () => {
        utc.addType(
          new GraphQLObjectType({
            name: 'CC',
            fields: () => ({}),
          })
        );
        expect(utc.hasType('CC')).toBeTruthy();
      });

      it('should add by type name', () => {
        utc.addType('SomeType');
        expect(utc.hasType('SomeType')).toBeTruthy();
        TypeComposer.create('SomeType');
        expect(utc.getTypes()).toHaveLength(3);
      });

      it('should add by type def', () => {
        utc.addType(`type SomeType2 { a: Int }`);
        expect(utc.hasType('SomeType2')).toBeTruthy();
        expect(utc.getTypes()).toHaveLength(3);
      });
    });

    describe('setTypes()', () => {
      it('should replace all types', () => {
        utc.setTypes([
          new GraphQLObjectType({
            name: 'CC',
            fields: () => ({}),
          }),
        ]);
        expect(utc.getTypes()).toHaveLength(1);
      });

      it('should set types in different ways', () => {
        utc.setTypes([
          new GraphQLObjectType({
            name: 'CC',
            fields: () => ({}),
          }),
          `DD`,
          `type EE { a: Int }`,
        ]);

        expect(utc.getTypes()).toHaveLength(3);

        TypeComposer.create('type DD { a: Int }');
        expect(utc.getType().getTypes()).toHaveLength(3);
      });
    });

    describe('removeType()', () => {
      it('should remove one field', () => {
        utc.removeType('A');
        expect(utc.getTypeNames()).toEqual(['B']);
      });

      it('should remove list of fields', () => {
        utc.removeType(['A', 'C']);
        expect(utc.getTypeNames()).toEqual(['B']);
        utc.removeType(['B', 'C']);
        expect(utc.getTypeNames()).toEqual([]);
      });
    });

    describe('removeOtherTypes()', () => {
      it('should remove one field', () => {
        utc.removeOtherTypes('B');
        expect(utc.getTypeNames()).toEqual(['B']);
      });

      it('should remove list of fields', () => {
        utc.removeOtherTypes(['B', 'C']);
        expect(utc.getTypeNames()).toEqual(['B']);
      });
    });
  });

  describe('clone()', () => {
    it('should create new Union', () => {
      const utc2 = utc.clone('NewObject');
      utc2.addType('AAA');

      expect(utc2.getTypes()).toHaveLength(3);
      expect(utc.getTypes()).toHaveLength(2);
    });
  });

  describe('get type methods', () => {
    it('getTypePlural() should return wrapped type with GraphQLList', () => {
      expect(utc.getTypePlural()).toBeInstanceOf(GraphQLList);
      expect(utc.getTypePlural().ofType).toBe(utc.getType());
    });

    it('getTypeNonNull() should return wrapped type with GraphQLNonNull', () => {
      expect(utc.getTypeNonNull()).toBeInstanceOf(GraphQLNonNull);
      expect(utc.getTypeNonNull().ofType).toBe(utc.getType());
    });

    it('setDescription() should return wrapped type with GraphQLList', () => {
      utc.setDescription('My union type');
      expect(utc.getDescription()).toBe('My union type');
    });

    it('setTypeName() should return wrapped type with GraphQLList', () => {
      expect(utc.getTypeName()).toBe('MyUnion');
      utc.setTypeName('NewUnionName');
      expect(utc.getTypeName()).toBe('NewUnionName');
    });
  });

  it('should have chainable methods', () => {
    expect(utc.setTypes(['BBB'])).toBe(utc);
    expect(utc.addType('CCC')).toBe(utc);
    expect(utc.removeType('CCC')).toBe(utc);
    expect(utc.removeOtherTypes('BBB')).toBe(utc);
    expect(utc.setTypeName('Union2')).toBe(utc);
    expect(utc.setDescription('desc')).toBe(utc);
    expect(utc.clearTypes()).toBe(utc);
  });

  describe('typeResolvers methods', () => {
    let PersonTC;
    let KindRedTC;
    let KindBlueTC;

    beforeEach(() => {
      utc.clearTypes();

      PersonTC = TypeComposer.create(`
        type Person { age: Int, field1: String, field2: String }
      `);
      utc.addTypeResolver(PersonTC, value => {
        return value.hasOwnProperty('age');
      });

      KindRedTC = TypeComposer.create(`
        type KindRed { kind: String, field1: String, field2: String, red: String }
      `);
      utc.addTypeResolver(KindRedTC, value => {
        return value.kind === 'red';
      });

      KindBlueTC = TypeComposer.create(`
        type KindBlue { kind: String, field1: String, field2: String, blue: String }
      `);
      utc.addTypeResolver(KindBlueTC, value => {
        return value.kind === 'blue';
      });
    });

    it('integration test', async () => {
      schemaComposer.Query.addFields({
        test: {
          type: [utc],
          resolve: () => [
            { kind: 'red', field1: 'KindRed' },
            { age: 15, field1: 'Name' },
            { kind: 'blue', field1: 'KindBlue' },
          ],
        },
      });

      const res = await graphql(
        schemaComposer.buildSchema(),
        `
          query {
            test {
              __typename
              ... on Person {
                age
                field1
                field2
              }
              ... on KindRed {
                kind
                field1
              }
              ... on KindBlue {
                kind
                field2
              }
            }
          }
        `
      );
      expect(res).toEqual({
        data: {
          test: [
            { __typename: 'KindRed', field1: 'KindRed', kind: 'red' },
            { __typename: 'Person', age: 15, field1: 'Name', field2: null },
            { __typename: 'KindBlue', field2: null, kind: 'blue' },
          ],
        },
      });
    });

    it('hasTypeResolver()', () => {
      expect(utc.hasTypeResolver(PersonTC)).toBeTruthy();
      expect(utc.hasTypeResolver(KindRedTC)).toBeTruthy();
      expect(utc.hasTypeResolver(KindBlueTC)).toBeTruthy();
      expect(utc.hasTypeResolver(TypeComposer.create('NewOne'))).toBeFalsy();
    });

    it('getTypeResolvers()', () => {
      const trm = utc.getTypeResolvers();
      expect(trm).toBeInstanceOf(Map);
      expect(trm.size).toBe(3);
    });

    it('getTypeResolverCheckFn()', () => {
      const checkFn: any = utc.getTypeResolverCheckFn(PersonTC);
      expect(checkFn({ age: 15 })).toBeTruthy();
      expect(checkFn({ nope: 'other type' })).toBeFalsy();
    });

    it('getTypeResolverNames()', () => {
      expect(utc.getTypeResolverNames()).toEqual(
        expect.arrayContaining(['Person', 'KindRed', 'KindBlue'])
      );
    });

    it('getTypeResolverTypes()', () => {
      expect(utc.getTypeResolverTypes()).toEqual(
        expect.arrayContaining([PersonTC.getType(), KindRedTC.getType(), KindBlueTC.getType()])
      );
    });

    describe('setTypeResolvers()', () => {
      it('async mode', async () => {
        const map = new Map([
          [PersonTC.getType(), async () => Promise.resolve(false)],
          [KindRedTC, async () => Promise.resolve(true)],
        ]);
        utc.setTypeResolvers(map);

        const resolveType: any = utc.gqType.resolveType;
        expect(resolveType()).toBeInstanceOf(Promise);
        expect(await resolveType()).toBe(KindRedTC.getType());
      });

      it('sync mode', () => {
        const map = new Map([
          [PersonTC.getType(), () => false],
          [KindRedTC, () => false],
          [KindBlueTC, () => true],
        ]);
        utc.setTypeResolvers(map);

        const resolveType: any = utc.gqType.resolveType;
        expect(resolveType()).toBe(KindBlueTC.getType());
      });

      it('throw error on wrong type', () => {
        expect(() => {
          const map: any = new Map([[false, () => true]]);
          utc.setTypeResolvers(map);
        }).toThrowError();
      });

      it('throw error on wrong checkFn', () => {
        expect(() => {
          const map: any = new Map([[PersonTC, true]]);
          utc.setTypeResolvers(map);
        }).toThrowError();
      });
    });

    it('addTypeResolver()', () => {
      const fn = () => false;
      utc.addTypeResolver(PersonTC, fn);
      expect(utc.getTypeResolverCheckFn(PersonTC)).toBe(fn);

      expect(() => {
        (utc: any).addTypeResolver(PersonTC);
      }).toThrowError();
    });

    it('removeTypeResolver()', () => {
      expect(utc.hasTypeResolver(PersonTC)).toBeTruthy();
      utc.removeTypeResolver(PersonTC);
      expect(utc.hasTypeResolver(PersonTC)).toBeFalsy();
    });

    describe('check native resolveType methods', () => {
      it('check methods setResolveType() getResolveType()', () => {
        const utc1 = schemaComposer.createUnionTC(`union U = A | B`);
        const resolveType = () => 'A';
        expect(utc1.getResolveType()).toBeUndefined();
        utc1.setResolveType(resolveType);
        expect(utc1.getResolveType()).toBe(resolveType);
      });

      it('integration test', async () => {
        const aTC = schemaComposer.createTC('type A { a: Int }');
        const bTC = schemaComposer.createTC('type B { b: Int }');
        const utc1 = schemaComposer.createUnionTC(`union U = A | B`);
        const resolveType = value => {
          if (value) {
            if (value.a) return 'A';
            else if (value.b) return 'B';
          }
          return null;
        };

        utc1.setResolveType(resolveType);
        schemaComposer.addSchemaMustHaveType(aTC);
        schemaComposer.addSchemaMustHaveType(bTC);
        schemaComposer.Query.addFields({
          check: {
            type: '[U]',
            resolve: () => [{ a: 1 }, { b: 2 }, { c: 3 }],
          },
        });
        const res = await graphql(
          schemaComposer.buildSchema(),
          `
            query {
              check {
                __typename
                ... on A {
                  a
                }
                ... on B {
                  b
                }
              }
            }
          `
        );
        expect(res.data).toEqual({
          check: [{ __typename: 'A', a: 1 }, { __typename: 'B', b: 2 }, null],
        });
      });
    });
  });
});
