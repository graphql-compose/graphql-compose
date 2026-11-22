import { SchemaComposer } from '../..';
import {
  buildSchema,
  graphqlSync,
  GraphQLInputObjectType,
  GraphQLObjectType,
  ObjectTypeDefinitionNode,
  parse,
} from 'graphql';

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
    // graphql-js 17 says "exactly one field must be specified", 16 says
    // "exactly one key must be specified"; match the shared wording.
    expect(res.errors?.[0].message).toMatch(/exactly one (field|key) must be specified/);
  });

  it('keeps OneOf validation when an unrelated directive is added to a wrapped prebuilt type', () => {
    const schema = buildSchema(`
      directive @oneOf on INPUT_OBJECT
      input By @oneOf { id: ID email: String }
      type Query { u(by: By): String }
    `);
    const sc = new SchemaComposer();
    const itc = sc.createInputTC(schema.getType('By') as GraphQLInputObjectType);
    expect(itc.getType().isOneOf).toBe(true);
    itc.setDirectiveByName('other', {});
    expect(itc.getType().isOneOf).toBe(true);
  });

  it('keeps OneOf validation through clone() and merge()', () => {
    const sc = new SchemaComposer();
    sc.addTypeDefs(`
      input By @oneOf { id: ID email: String }
      input Empty { x: Int }
      type Query { user(by: By): String }
    `);
    const cloned = sc.clone();
    expect(cloned.getITC('By').getType().isOneOf).toBe(true);
    const res = graphqlSync({
      schema: cloned.buildSchema(),
      source: '{ user(by: { id: "1", email: "x" }) }',
    });
    expect(res.errors?.[0].message).toMatch(/exactly one (field|key) must be specified/);

    sc.getITC('Empty').merge(sc.getITC('By'));
    expect(sc.getITC('Empty').getType().isOneOf).toBe(true);
  });

  it('applies nested defaults inside other deferred defaults', () => {
    const sc = new SchemaComposer();
    sc.addTypeDefs(`
      type Query { f(a: A = {}): Int }
      input A { b: B = { n: 1 } }
      input B { n: Int }
    `);
    expect(sc.Query.getField('f').args!.a.defaultValue).toEqual({ b: { n: 1 } });
  });

  it('applies nested defaults transitively and into the built schema', () => {
    const sc = new SchemaComposer();
    sc.addTypeDefs(`
      type Query { f(a: A = {}): Int }
      input A { b: B = {} }
      input B { c: Int = 7 }
    `);
    expect(sc.Query.getField('f').args!.a.defaultValue).toEqual({ b: { c: 7 } });
    const built = sc.buildSchema();
    expect((built.getType('A') as GraphQLInputObjectType).getFields().b.defaultValue).toEqual({
      c: 7,
    });
    expect(
      (built.getType('Query') as GraphQLObjectType).getFields().f.args[0].defaultValue
    ).toEqual({ b: { c: 7 } });
  });

  it('does not throw when the nested type of a registered input is defined later', () => {
    const sc = new SchemaComposer();
    expect(() => {
      sc.addTypeDefs(`
        input A { b: B }
        type Query { f(a: A = {}): Int }
        input B { x: Int }
      `);
    }).not.toThrow();
    expect(sc.Query.getField('f').args!.a.defaultValue).toEqual({});
  });

  it('does not hang on recursive input defaults', () => {
    const sc = new SchemaComposer();
    expect(() => {
      sc.addTypeDefs(`
        input A { b: A = {} }
        type Query { f(a: A = {}): Int }
      `);
    }).not.toThrow();
    expect(sc.Query.getField('f').args!.a.defaultValue).toEqual({ b: {} });
  });

  it('keeps the scalar/enum fallback for direct makeArguments calls', () => {
    const sc = new SchemaComposer();
    const doc = parse(`type Query { f(x: Order = ASC): Int }`);
    const fieldDef = (doc.definitions[0] as ObjectTypeDefinitionNode).fields![0];
    const args = sc.typeMapper.makeArguments(fieldDef.arguments);
    expect(args.x.defaultValue).toBe('ASC');
    expect(() => {
      sc.addTypeDefs(`input Filter { min: Int } type Query { z: Int }`);
    }).not.toThrow();
  });

  it('keeps forward-referenced interfaces lazy when Query already exists', () => {
    const sc = new SchemaComposer();
    sc.addTypeDefs(`type Query { a: Int }`);
    expect(() => {
      sc.addTypeDefs(`type Query implements Node { id: ID } interface Node { id: ID }`);
    }).not.toThrow();
    expect(sc.Query.getInterfaces().map((i) => i.getTypeName())).toEqual(['Node']);
    expect(sc.Query.getFieldNames()).toEqual(['a', 'id']);
  });

  it('keeps every application of a repeatable directive on merge', () => {
    const sc = new SchemaComposer();
    sc.addTypeDefs(`directive @tag repeatable on OBJECT\ntype Query { a: Int }`);
    sc.addTypeDefs(`type Query @tag @tag { b: Int }`);
    expect(sc.Query.getDirectives()).toEqual([
      { name: 'tag', args: {} },
      { name: 'tag', args: {} },
    ]);
  });

  it('keeps repeatable applications when the directive is defined later in the document', () => {
    const sc = new SchemaComposer();
    sc.addTypeDefs(`type Query { a: Int }`);
    sc.addTypeDefs(`type Query @tag @tag { b: Int }\n directive @tag repeatable on OBJECT`);
    expect(sc.Query.getDirectives()).toEqual([
      { name: 'tag', args: {} },
      { name: 'tag', args: {} },
    ]);
  });

  it('still deduplicates a non-repeatable directive on merge', () => {
    const sc = new SchemaComposer();
    sc.addTypeDefs(
      `directive @auth(role: String) on OBJECT\ntype Query @auth(role: "q") { a: Int }`
    );
    sc.addTypeDefs(`type Query @auth(role: "q") { b: Int }`);
    expect(sc.Query.getDirectives()).toEqual([{ name: 'auth', args: { role: 'q' } }]);
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
