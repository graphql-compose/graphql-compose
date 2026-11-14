import { SchemaComposer } from '../..';
import { buildSchema, graphqlSync, GraphQLInputObjectType } from 'graphql';

describe('github issue #420', () => {
  it('extend type Query keeps base fields in the same addTypeDefs call', () => {
    const sc = new SchemaComposer();
    sc.addTypeDefs(`
      type Query { a: Int }
      extend type Query { b: String }
    `);
    expect(sc.Query.getFieldNames()).toEqual(['a', 'b']);
  });

  it('keeps root type description and directives in the same addTypeDefs call', () => {
    const sc = new SchemaComposer();
    sc.addTypeDefs(`
      directive @auth(role: String) on OBJECT
      "Root doc" type Query @auth(role: "q") { u: User }
      "User doc" type User @auth(role: "u") { a: Int }
    `);
    expect(sc.Query.getDescription()).toBe('Root doc');
    expect(sc.Query.getDirectives()).toEqual([{ name: 'auth', args: { role: 'q' } }]);
    expect(sc.getOTC('User').getDescription()).toBe('User doc');
  });

  it('accepts forward-referenced types in arg default values', () => {
    const sc = new SchemaComposer();
    expect(() => {
      sc.addTypeDefs(`
        type Query { list(order: Order = ASC, filter: Filter = { min: 1 }): Int }
        enum Order { ASC DESC }
        input Filter { min: Int }
      `);
    }).not.toThrow();
    const args = sc.Query.getField('list').args!;
    expect(args.order.defaultValue).toBe('ASC');
    expect(args.filter.defaultValue).toEqual({ min: 1 });
  });

  it('accepts forward-referenced types in input field default values', () => {
    const sc = new SchemaComposer();
    expect(() => {
      sc.addTypeDefs(`
        input Opt { f: Filter = { min: 2 } }
        input Filter { min: Int }
        type Query { x(o: Opt): String }
      `);
    }).not.toThrow();
    expect(sc.getITC('Opt').getField('f').defaultValue).toEqual({ min: 2 });
  });

  it('keeps repeatable on directive definitions so the printed SDL validates', () => {
    const sc = new SchemaComposer();
    sc.addTypeDefs(`
      directive @tag(name: String) repeatable on OBJECT
      type Query { u: User }
      type User @tag(name: "a") @tag(name: "b") { a: Int }
    `);
    const sdl = sc.toSDL({ omitScalars: true });
    expect(sdl.split('\n')[0]).toBe('directive @tag(name: String) repeatable on OBJECT');
    expect(() => buildSchema(sdl)).not.toThrow();
  });

  it('carries @oneOf into the built schema', () => {
    const sc = new SchemaComposer();
    sc.addTypeDefs(`
      input By @oneOf { id: ID email: String }
      type Query { user(by: By): String }
    `);
    sc.Query.extendField('user', { resolve: (_, args) => JSON.stringify(args.by) });
    const built = sc.buildSchema();
    expect((built.getType('By') as GraphQLInputObjectType).isOneOf).toBe(true);
    expect(sc.toSDL({ omitScalars: true })).toContain('input By @oneOf');
    const res = graphqlSync({
      schema: built,
      source: '{ user(by: { id: "1", email: "x" }) }',
    });
    expect(res.errors?.[0].message).toMatch(/exactly one field must be specified/);
  });

  it('still accumulates fields across separate addTypeDefs calls', () => {
    const sc = new SchemaComposer();
    sc.addTypeDefs(`type Query { a: Int }`);
    sc.addTypeDefs(`extend type Query { b: String }`);
    sc.addTypeDefs(`"Second doc" type Query { c: Int }`);
    expect(sc.Query.getFieldNames()).toEqual(['a', 'b', 'c']);
    expect(sc.Query.getDescription()).toBe('Second doc');
  });
});
