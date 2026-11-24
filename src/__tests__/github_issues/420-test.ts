import { SchemaComposer, ObjectTypeComposer, graphqlVersion } from '../..';
import {
  buildSchema,
  graphqlSync,
  parse,
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import type { ObjectTypeDefinitionNode } from 'graphql';

// OneOf input objects are supported since graphql-js 16.9
const supportsOneOf =
  new GraphQLInputObjectType({ name: 'T', fields: {}, isOneOf: true }).isOneOf === true;

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
    if (graphqlVersion < 15) return;
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
    if (!supportsOneOf) return;
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
    // graphql-js 16: "must specify exactly one key", graphql-js 17: "exactly one field must be specified"
    expect(res.errors?.[0].message).toMatch(/exactly one (key|field)/);
  });

  it('keeps OneOf of a wrapped type until @oneOf is removed', () => {
    if (!supportsOneOf) return;
    const sc = new SchemaComposer();
    sc.addTypeDefs(`directive @other on INPUT_OBJECT`);
    const createOneOfTC = (name: string) =>
      sc.createInputTC(
        new GraphQLInputObjectType({
          name,
          isOneOf: true,
          fields: { id: { type: GraphQLID }, email: { type: GraphQLString } },
        })
      );
    const itc = createOneOfTC('By');
    itc.setDirectiveByName('other');
    expect(itc.getType().isOneOf).toBe(true);
    itc.removeDirective('oneOf');
    expect(itc.getType().isOneOf).toBe(false);
    expect(createOneOfTC('By2').removeDirective('oneOf').getType().isOneOf).toBe(false);
  });

  it('keeps isOneOf which was set on the GraphQL type', () => {
    const sc = new SchemaComposer();
    sc.addTypeDefs(`input By { id: ID email: String }`);
    const itc = sc.getITC('By');
    (itc.getType() as any).isOneOf = true;
    expect(itc.getType().isOneOf).toBe(true);
  });

  it('keeps @oneOf when a schema is cloned or merged', () => {
    if (!supportsOneOf) return;
    const sc = new SchemaComposer();
    sc.addTypeDefs(`
      input By @oneOf { id: ID email: String }
      type Query { user(by: By): String }
    `);
    const isOneOf = (s: SchemaComposer<any>) => s.getITC('By').getType().isOneOf;
    expect((sc.clone().buildSchema().getType('By') as GraphQLInputObjectType).isOneOf).toBe(true);
    expect(isOneOf(new SchemaComposer().merge(sc))).toBe(true);

    const target = new SchemaComposer();
    target.addTypeDefs(`
      input By { id: ID }
      type Query { user(by: By): String }
    `);
    expect(isOneOf(target.merge(sc))).toBe(true);
  });

  it('resolves nested input-field defaults before the defaults that use them', () => {
    const sc = new SchemaComposer();
    sc.addTypeDefs(`
      type Query { f(a: A = {}): String }
      input A { b: B = { n: 1 } }
      input B { n: Int }
    `);
    expect(sc.Query.getFieldArg('f', 'a').defaultValue).toEqual({ b: { n: 1 } });
    sc.Query.extendField('f', { resolve: (_, args) => JSON.stringify(args.a) });
    const schema = sc.buildSchema();
    expect(graphqlSync({ schema, source: '{ f }' }).data).toEqual({ f: '{"b":{"n":1}}' });
    expect(graphqlSync({ schema, source: '{ f(a: {}) }' }).data).toEqual({ f: '{"b":{"n":1}}' });

    // through an input type without deferred defaults of its own
    const sc2 = new SchemaComposer();
    sc2.addTypeDefs(`
      type Query { f(a: A = { b: {} }): Int }
      input A { b: B }
      input B { c: C = {} }
      input C { x: Int = 1 }
    `);
    expect(sc2.Query.getFieldArg('f', 'a').defaultValue).toEqual({ b: { c: { x: 1 } } });
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

  it('defers defaults of already defined input types which refer to later types', () => {
    const sc = new SchemaComposer();
    expect(() => {
      sc.addTypeDefs(`
        input A { b: B }
        type Query { f(a: A = {}): Int }
        input C { a: A = {} }
        input B { x: Int }
      `);
    }).not.toThrow();
    expect(sc.Query.getFieldArg('f', 'a').defaultValue).toEqual({});
    expect(sc.getITC('C').getField('a').defaultValue).toEqual({});
  });

  it('applies input-field defaults to directive values parsed in the same document', () => {
    const sc = new SchemaComposer();
    sc.addTypeDefs(`
      input Rule { allow: String, ownerField: String = "owner" }
      directive @auth(rules: [Rule!], rule: Rule = {}) on OBJECT
      type Post @auth(rules: [{ allow: "owner" }]) { id: ID }
      type Query { p: Post }
    `);
    expect(sc.getOTC('Post').getDirectives()).toEqual([
      {
        name: 'auth',
        args: {
          rules: [{ allow: 'owner', ownerField: 'owner' }],
          rule: { ownerField: 'owner' },
        },
      },
    ]);
  });

  it('converts defaults at once when TypeMapper methods are called outside of a parse', () => {
    const sc = new SchemaComposer();
    const def = parse(`type T { f(a: Int = 1, o: Order = ASC): Int }`)
      .definitions[0] as ObjectTypeDefinitionNode;
    const args = sc.typeMapper.makeArguments(def.fields![0].arguments);
    expect(args.a.defaultValue).toBe(1);
    expect(args.o.defaultValue).toBe('ASC');
    expect(() => sc.addTypeDefs(`type Query { x: Int }`)).not.toThrow();

    const tc = sc.typeMapper.makeSchemaDef(def) as ObjectTypeComposer;
    expect(tc.getFieldArg('f', 'o').defaultValue).toBe('ASC');
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

  it('merges directives into an existing root type', () => {
    if (graphqlVersion < 15) return;
    const sc = new SchemaComposer();
    sc.Query.addFields({ z: 'Int' });
    sc.addTypeDefs(`
      directive @tag(name: String) repeatable on OBJECT
      directive @auth(role: String) on OBJECT
      type Query @tag(name: "a") @tag(name: "a") @auth(role: "a") { a: Int }
    `);
    sc.addTypeDefs(`
      type Query @auth(role: "b") @late @late { b: Int }
      directive @late repeatable on OBJECT
    `);
    expect(sc.Query.getDirectives()).toEqual([
      { name: 'tag', args: { name: 'a' } },
      { name: 'tag', args: { name: 'a' } },
      { name: 'auth', args: { role: 'b' } },
      { name: 'late', args: {} },
      { name: 'late', args: {} },
    ]);
    expect(() => buildSchema(sc.toSDL({ omitScalars: true }))).not.toThrow();
  });

  it('still accumulates fields across separate addTypeDefs calls', () => {
    const sc = new SchemaComposer();
    sc.addTypeDefs(`type Query { a: Int }`);
    sc.addTypeDefs(`extend type Query { b: String }`);
    sc.addTypeDefs(`"Second doc" type Query { c: Int }`);
    expect(sc.Query.getFieldNames()).toEqual(['a', 'b', 'c']);
    expect(sc.Query.getDescription()).toBe('Second doc');
    expect(() => sc.buildSchema({ keepUnusedTypes: true })).not.toThrow();
  });
});
