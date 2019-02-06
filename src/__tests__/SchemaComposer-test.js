/* @flow strict */

import { SchemaComposer } from '..';
import { TypeComposer } from '../TypeComposer';
import { InputTypeComposer } from '../InputTypeComposer';
import { EnumTypeComposer } from '../EnumTypeComposer';
import { InterfaceTypeComposer } from '../InterfaceTypeComposer';
import { UnionTypeComposer } from '../UnionTypeComposer';
import {
  graphql,
  GraphQLString,
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLEnumType,
  GraphQLDirective,
  DirectiveLocation,
  GraphQLSkipDirective,
  GraphQLIncludeDirective,
  GraphQLDeprecatedDirective,
} from '../graphql';

describe('SchemaComposer', () => {
  it('should implements `add` method', () => {
    const sc = new SchemaComposer();
    const SomeTC = sc.TypeComposer.create({ name: 'validType' });
    sc.add(SomeTC);
    expect(sc.get('validType')).toBe(SomeTC);
  });

  it('should implements `get` method', () => {
    const sc = new SchemaComposer();
    const SomeTC = sc.TypeComposer.create({ name: 'validType' });
    sc.add(SomeTC);
    expect(sc.get('validType')).toBe(SomeTC);
  });

  it('should implements `has` method`', () => {
    const sc = new SchemaComposer();
    const SomeTC = sc.TypeComposer.create({ name: 'validType' });
    sc.add(SomeTC);
    expect(sc.has('validType')).toBe(true);
    expect(sc.has('unexistedType')).toBe(false);
  });

  describe('getOrCreateTC()', () => {
    it('should create TC if not exists', () => {
      const sc = new SchemaComposer();
      const UserTC = sc.getOrCreateTC('User');
      expect(UserTC).toBeInstanceOf(TypeComposer);
      expect(sc.has('User')).toBeTruthy();
      expect(sc.hasInstance('User', TypeComposer)).toBeTruthy();
      expect(sc.getTC('User')).toBe(UserTC);
    });

    it('should create TC if not exists with onCreate', () => {
      const sc = new SchemaComposer();
      const UserTC = sc.getOrCreateTC('User', tc => {
        tc.setDescription('User model');
      });
      expect(UserTC.getDescription()).toBe('User model');
    });

    it('should return already created TC without onCreate', () => {
      const sc = new SchemaComposer();
      const UserTC = sc.getOrCreateTC('User', tc => {
        tc.setDescription('User model');
      });
      const UserTC2 = sc.getOrCreateTC('User', tc => {
        tc.setDescription('updated description');
      });
      expect(UserTC).toBe(UserTC2);
      expect(UserTC.getDescription()).toBe('User model');
    });
  });

  describe('getOrCreateITC()', () => {
    it('should create ITC if not exists', () => {
      const sc = new SchemaComposer();
      const UserITC = sc.getOrCreateITC('UserInput');
      expect(UserITC).toBeInstanceOf(InputTypeComposer);
      expect(sc.has('UserInput')).toBeTruthy();
      expect(sc.hasInstance('UserInput', InputTypeComposer)).toBeTruthy();
      expect(sc.getITC('UserInput')).toBe(UserITC);
    });

    it('should create ITC if not exists with onCreate', () => {
      const sc = new SchemaComposer();
      const UserITC = sc.getOrCreateITC('UserInput', tc => {
        tc.setDescription('User input');
      });
      expect(UserITC.getDescription()).toBe('User input');
    });

    it('should return already created ITC without onCreate', () => {
      const sc = new SchemaComposer();
      const UserITC = sc.getOrCreateITC('UserInput', tc => {
        tc.setDescription('User input');
      });
      const UserITC2 = sc.getOrCreateITC('UserInput', tc => {
        tc.setDescription('updated description');
      });
      expect(UserITC).toBe(UserITC2);
      expect(UserITC.getDescription()).toBe('User input');
    });
  });

  describe('getOrCreateETC()', () => {
    it('should create ETC if not exists', () => {
      const sc = new SchemaComposer();
      const UserETC = sc.getOrCreateETC('UserEnum');
      expect(UserETC).toBeInstanceOf(EnumTypeComposer);
      expect(sc.has('UserEnum')).toBeTruthy();
      expect(sc.hasInstance('UserEnum', EnumTypeComposer)).toBeTruthy();
      expect(sc.getETC('UserEnum')).toBe(UserETC);
    });

    it('should create ETC if not exists with onCreate', () => {
      const sc = new SchemaComposer();
      const UserETC = sc.getOrCreateETC('UserEnum', tc => {
        tc.setDescription('User enum');
      });
      expect(UserETC.getDescription()).toBe('User enum');
    });

    it('should return already created ETC without onCreate', () => {
      const sc = new SchemaComposer();
      const UserETC = sc.getOrCreateETC('UserEnum', tc => {
        tc.setDescription('User enum');
      });
      const UserETC2 = sc.getOrCreateETC('UserEnum', tc => {
        tc.setDescription('updated description');
      });
      expect(UserETC).toBe(UserETC2);
      expect(UserETC.getDescription()).toBe('User enum');
    });
  });

  describe('getOrCreateIFTC()', () => {
    it('should create IFTC if not exists', () => {
      const sc = new SchemaComposer();
      const UserIFTC = sc.getOrCreateIFTC('UserInterface');
      expect(UserIFTC).toBeInstanceOf(InterfaceTypeComposer);
      expect(sc.has('UserInterface')).toBeTruthy();
      expect(sc.hasInstance('UserInterface', InterfaceTypeComposer)).toBeTruthy();
      expect(sc.getIFTC('UserInterface')).toBe(UserIFTC);
    });

    it('should create IFTC if not exists with onCreate', () => {
      const sc = new SchemaComposer();
      const UserIFTC = sc.getOrCreateIFTC('UserInterface', tc => {
        tc.setDescription('User interface');
      });
      expect(UserIFTC.getDescription()).toBe('User interface');
    });

    it('should return already created IFTC without onCreate', () => {
      const sc = new SchemaComposer();
      const UserIFTC = sc.getOrCreateIFTC('UserInterface', tc => {
        tc.setDescription('User interface');
      });
      const UserIFTC2 = sc.getOrCreateIFTC('UserInterface', tc => {
        tc.setDescription('updated description');
      });
      expect(UserIFTC).toBe(UserIFTC2);
      expect(UserIFTC.getDescription()).toBe('User interface');
    });
  });

  describe('buildSchema()', () => {
    it('should throw error, if root fields not defined', () => {
      const sc = new SchemaComposer();
      sc.clear();

      expect(() => {
        sc.buildSchema();
      }).toThrowError();
    });

    it('should accept additional types', () => {
      const sc = new SchemaComposer();
      sc.Query.addFields({ time: 'Int' });
      const me1 = sc.TypeComposer.create('type Me1 { a: Int }').getType();
      const me2 = sc.TypeComposer.create('type Me2 { a: Int }').getType();
      const schema = sc.buildSchema({ types: [me1, me1, me2] });

      expect(schema._typeMap.Me1).toEqual(me1);
      expect(schema._typeMap.Me2).toEqual(me2);
    });

    it('should provide proper Schema when provided only Query', async () => {
      const sc = new SchemaComposer();
      sc.Query.addFields({ num: 'Int' });
      const schema = sc.buildSchema();
      expect(
        await graphql({
          schema,
          source: `
            query {
              num
            }
          `,
        })
      ).toEqual({ data: { num: null } });
    });

    it('should throw error if only Mutation provided', async () => {
      const sc = new SchemaComposer();
      sc.Mutation.addFields({ num: 'Int' });
      expect(() => {
        sc.buildSchema();
      }).toThrow('Must be initialized Query type');
    });
  });

  describe('removeEmptyTypes()', () => {
    it('should remove fields with Types which have no fields', () => {
      const sc = new SchemaComposer();
      const TypeWithoutFieldsTC = sc.getOrCreateTC('Stub');
      TypeWithoutFieldsTC.setFields({});

      const ViewerTC = sc.getOrCreateTC('Viewer');
      ViewerTC.setFields({
        name: 'String',
        stub: TypeWithoutFieldsTC,
      });

      /* eslint-disable */
      const oldConsoleLog = console.log;
      global.console.log = jest.fn();

      sc.removeEmptyTypes(ViewerTC);

      expect(console.log).lastCalledWith(
        "graphql-compose: Delete field 'Viewer.stub' with type 'Stub', cause it does not have fields."
      );
      global.console.log = oldConsoleLog;
      /* eslint-enable */

      expect(ViewerTC.hasField('stub')).toBe(false);
    });

    it('should not produce Maximum call stack size exceeded', () => {
      const sc = new SchemaComposer();
      const UserTC = sc.getOrCreateTC('User');
      UserTC.setField('friend', UserTC);

      sc.removeEmptyTypes(UserTC);
    });
  });

  describe('root type getters', () => {
    it('Query', () => {
      const sc = new SchemaComposer();
      expect(sc.Query).toBe(sc.rootQuery());
      expect(sc.Query.getTypeName()).toBe('Query');
    });

    it('Mutation', () => {
      const sc = new SchemaComposer();
      expect(sc.Mutation).toBe(sc.rootMutation());
      expect(sc.Mutation.getTypeName()).toBe('Mutation');
    });

    it('Subscription', () => {
      const sc = new SchemaComposer();
      expect(sc.Subscription).toBe(sc.rootSubscription());
      expect(sc.Subscription.getTypeName()).toBe('Subscription');
    });
  });

  describe('SchemaMustHaveType', () => {
    const sc = new SchemaComposer();
    const tc = sc.TypeComposer.create(`type Me { name: String }`);

    sc.addSchemaMustHaveType(tc);
    expect(sc._schemaMustHaveTypes).toContain(tc);

    sc.clear();
    expect(sc._schemaMustHaveTypes).not.toContain(tc);

    sc.addSchemaMustHaveType(tc);
    sc.Query.addFields({ time: 'String' });
    const schema = sc.buildSchema();
    expect(schema._typeMap.Me).toEqual(tc.getType());
  });

  describe('getTC', () => {
    it('should return TypeComposer', () => {
      const sc = new SchemaComposer();
      sc.TypeComposer.create(`
          type Author {
            name: String
          }
        `);
      expect(sc.getTC('Author')).toBeInstanceOf(TypeComposer);
    });

    it('should return GraphQLObjectType as TypeComposer', () => {
      const sc = new SchemaComposer();
      sc.add(
        new GraphQLObjectType({
          name: 'Author',
          fields: { name: { type: GraphQLString } },
        })
      );
      expect(sc.getTC('Author')).toBeInstanceOf(TypeComposer);
    });

    it('should throw error for incorrect type', () => {
      const sc = new SchemaComposer();
      sc.InputTypeComposer.create(`
        input Author {
          name: String
        }
      `);
      expect(() => sc.getTC('Author')).toThrowError('Cannot find TypeComposer with name Author');
    });
  });

  describe('getITC', () => {
    it('should return InputTypeComposer', () => {
      const sc = new SchemaComposer();
      sc.InputTypeComposer.create(`
          input Author {
            name: String
          }
        `);
      expect(sc.getITC('Author')).toBeInstanceOf(InputTypeComposer);
    });

    it('should return GraphQLInputObjectType as InputTypeComposer', () => {
      const sc = new SchemaComposer();
      sc.add(
        new GraphQLInputObjectType({
          name: 'Author',
          fields: { name: { type: GraphQLString } },
        })
      );
      expect(sc.getITC('Author')).toBeInstanceOf(InputTypeComposer);
    });

    it('should throw error for incorrect type', () => {
      const sc = new SchemaComposer();
      sc.TypeComposer.create(`
        type Author {
          name: String
        }
      `);
      expect(() => sc.getITC('Author')).toThrowError(
        'Cannot find InputTypeComposer with name Author'
      );
    });
  });

  describe('getETC', () => {
    it('should return EnumTypeComposer', () => {
      const sc = new SchemaComposer();
      sc.EnumTypeComposer.create(`
          enum Sort {
            ASC DESC
          }
        `);
      expect(sc.getETC('Sort')).toBeInstanceOf(EnumTypeComposer);
    });

    it('should return GraphQLEnumType as EnumTypeComposer', () => {
      const sc = new SchemaComposer();
      sc.add(
        new GraphQLEnumType({
          name: 'Sort',
          values: { ASC: { value: 'ASC' } },
        })
      );
      expect(sc.getETC('Sort')).toBeInstanceOf(EnumTypeComposer);
    });

    it('should throw error for incorrect type', () => {
      const sc = new SchemaComposer();
      sc.TypeComposer.create(`
        type Sort {
          name: String
        }
      `);
      expect(() => sc.getETC('Sort')).toThrowError('Cannot find EnumTypeComposer with name Sort');
    });
  });

  describe('getIFTC', () => {
    it('should return InterfaceTypeComposer', () => {
      const sc = new SchemaComposer();
      sc.InterfaceTypeComposer.create(`
          interface IFace {
            name: String
          }
        `);
      expect(sc.getIFTC('IFace')).toBeInstanceOf(InterfaceTypeComposer);
    });

    it('should return GraphQLInterfaceType as InterfaceTypeComposer', () => {
      const sc = new SchemaComposer();
      sc.add(
        new GraphQLInterfaceType({
          name: 'IFace',
          fields: { name: { type: GraphQLString } },
        })
      );
      expect(sc.getIFTC('IFace')).toBeInstanceOf(InterfaceTypeComposer);
    });

    it('should throw error for incorrect type', () => {
      const sc = new SchemaComposer();
      sc.TypeComposer.create(`
        type IFace {
          name: String
        }
      `);
      expect(() => sc.getIFTC('IFace')).toThrowError(
        'Cannot find InterfaceTypeComposer with name IFace'
      );
    });
  });

  describe('addTypeDefs', () => {
    it('should parse types from SDL', () => {
      const sc = new SchemaComposer();
      sc.addTypeDefs(`
        type Author {
          name: String
          some(arg: Int): String
        }
        input AuthorInput {
          name: String
        }
        enum Sort {
          ASC 
          DESC
        }
        interface PersonI {
          name: String
        }
      `);

      expect(sc.get('Author')).toBeInstanceOf(GraphQLObjectType);
      expect(sc.get('AuthorInput')).toBeInstanceOf(GraphQLInputObjectType);
      expect(sc.get('Sort')).toBeInstanceOf(GraphQLEnumType);
      expect(sc.get('PersonI')).toBeInstanceOf(GraphQLInterfaceType);
    });

    it('should parse cross referenced types from SDL', () => {
      const sc = new SchemaComposer();
      sc.addTypeDefs(`
        type Author {
          posts: [Post]
        }
        type Post {
          author: Author
        }
      `);

      expect(sc.get('Author')).toBeInstanceOf(GraphQLObjectType);
      expect(sc.get('Post')).toBeInstanceOf(GraphQLObjectType);

      // Post type should be the same instance
      const Post = sc.get('Post');
      const PostInAuthor = sc.TypeComposer.createTemp((sc.get('Author'): any))
        .getFieldTC('posts')
        .getType();
      expect(Post).toBe(PostInAuthor);

      // Author type should be the same instance
      const Author = sc.get('Author');
      const AuthorInPost = sc.TypeComposer.createTemp((sc.get('Post'): any))
        .getFieldTC('author')
        .getType();
      expect(Author).toBe(AuthorInPost);
    });

    it('should replace existed types', () => {
      // This behavior maybe changed in future.
      // Need to gather more use cases and problems.
      const sc = new SchemaComposer();
      sc.addTypeDefs(`
        type Author {
          name: String
          some(arg: Int): String
        }
      `);
      expect(sc.getTC('Author').hasFieldArg('some', 'arg')).toBeTruthy();

      sc.addTypeDefs(`
        type Author {
          name: String
        }
      `);
      expect(sc.getTC('Author').hasFieldArg('some', 'arg')).toBeFalsy();
    });
  });

  describe('addResolveMethods', () => {
    it('should add resolve methods to fields in graphql-tools way', async () => {
      const sc = new SchemaComposer();
      sc.addTypeDefs(`
        schema {
          query: Query
        }
        
        type Post {
          id: Int!
          title: String
          votes: Int
        }

        type Query {
          posts: [Post]
        }
      `);

      sc.addResolveMethods({
        Query: {
          posts: () => [{ id: 1, title: 'Post title' }],
        },
        Post: {
          votes: () => 10,
        },
      });

      const schema = sc.buildSchema();

      expect(await graphql(schema, '{ posts { id title votes } }')).toEqual({
        data: { posts: [{ id: 1, title: 'Post title', votes: 10 }] },
      });
    });
  });

  describe('createTC helper methods', () => {
    it('createObjectTC()', () => {
      const sc = new SchemaComposer();
      const tc = sc.createObjectTC(`type A { f: Int }`);
      expect(tc).toBeInstanceOf(TypeComposer);
      expect(tc.hasField('f')).toBeTruthy();

      const tc2 = sc.createTC(`type B { f: Int }`);
      expect(tc2).toBeInstanceOf(TypeComposer);
      expect(tc2.hasField('f')).toBeTruthy();
    });

    it('createInputTC()', () => {
      const sc = new SchemaComposer();
      const tc = sc.createInputTC(`input A { f: Int }`);
      expect(tc).toBeInstanceOf(InputTypeComposer);
      expect(tc.hasField('f')).toBeTruthy();
    });

    it('createEnumTC()', () => {
      const sc = new SchemaComposer();
      const tc = sc.createEnumTC(`enum A { AAA BBB }`);
      expect(tc).toBeInstanceOf(EnumTypeComposer);
      expect(tc.hasField('AAA')).toBeTruthy();
    });

    it('createInterfaceTC()', () => {
      const sc = new SchemaComposer();
      const tc = sc.createInterfaceTC(`interface A { f: Int }`);
      expect(tc).toBeInstanceOf(InterfaceTypeComposer);
      expect(tc.hasField('f')).toBeTruthy();
    });

    it('createUnionTC()', () => {
      const sc = new SchemaComposer();
      sc.addTypeDefs(`
        type AA { a: Int }
        type BB { b: Int }
      `);
      const tc = sc.createUnionTC(`union A = AA | BB`);
      expect(tc).toBeInstanceOf(UnionTypeComposer);
      expect(tc.hasType('AA')).toBeTruthy();
    });
  });

  describe('works with directives', () => {
    const d1 = new GraphQLDirective({
      name: 'myDirective1',
      locations: [DirectiveLocation.INPUT_FIELD_DEFINITION],
      args: {
        value: {
          type: GraphQLString,
        },
      },
    });

    const d2 = new GraphQLDirective({
      name: 'myDirective2',
      locations: [DirectiveLocation.INPUT_FIELD_DEFINITION],
      args: {
        value: {
          type: GraphQLString,
        },
      },
    });

    function removeDefaultDirectives(sc) {
      sc.removeDirective(GraphQLSkipDirective);
      sc.removeDirective(GraphQLIncludeDirective);
      sc.removeDirective(GraphQLDeprecatedDirective);
    }

    it('has default directives', () => {
      const sc = new SchemaComposer();
      expect(sc.hasDirective('@skip')).toBe(true);
      expect(sc.hasDirective('@include')).toBe(true);
      expect(sc.hasDirective('@deprecated')).toBe(true);
      expect(sc.getDirectives()).toHaveLength(3);
    });

    it('addDirective()', () => {
      const sc = new SchemaComposer();
      removeDefaultDirectives(sc);
      sc.addDirective(d1);
      expect(sc.getDirectives()).toHaveLength(1);
      sc.addDirective(d1);
      expect(sc.getDirectives()).toHaveLength(1);
      sc.addDirective(d2);
      expect(sc.getDirectives()).toHaveLength(2);
    });

    it('removeDirective()', () => {
      const sc = new SchemaComposer();
      removeDefaultDirectives(sc);
      sc.addDirective(d1);
      sc.addDirective(d2);
      expect(sc.getDirectives()).toHaveLength(2);
      sc.removeDirective(d1);
      expect(sc.getDirectives()).toHaveLength(1);
      sc.removeDirective(d1);
      expect(sc.getDirectives()).toHaveLength(1);
      sc.removeDirective(d2);
      expect(sc.getDirectives()).toHaveLength(0);
    });

    it('addTypeDefs() should add directives', () => {
      const sc = new SchemaComposer();
      removeDefaultDirectives(sc);
      expect(sc.getDirectives()).toHaveLength(0);
      sc.addTypeDefs(`
        directive @customDirective(level: Int!) on FIELD
      `);
      expect(sc.getDirectives()).toHaveLength(1);
      expect(sc.getDirectives()[0]).toBeInstanceOf(GraphQLDirective);
    });

    it('clear() should clear directives and restore defaults', () => {
      const sc = new SchemaComposer();
      removeDefaultDirectives(sc);
      sc.addDirective(d1);
      expect(sc.getDirectives()).toHaveLength(1);
      sc.clear();
      expect(sc.hasDirective('@skip')).toBe(true);
      expect(sc.hasDirective('@include')).toBe(true);
      expect(sc.hasDirective('@deprecated')).toBe(true);
      expect(sc.getDirectives()).toHaveLength(3);
    });

    it('hasDirective()', () => {
      const sc = new SchemaComposer();
      removeDefaultDirectives(sc);
      sc.addDirective(d1);
      expect(sc.hasDirective(d1)).toBeTruthy();
      expect(sc.hasDirective('@myDirective1')).toBeTruthy();
      expect(sc.hasDirective('myDirective1')).toBeTruthy();

      expect(sc.hasDirective(d2)).toBeFalsy();
      expect(sc.hasDirective('myDirective2')).toBeFalsy();
    });
  });
});
