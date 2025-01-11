import deprecate from './utils/deprecate';
import { TypeStorage } from './TypeStorage';
import { TypeMapper } from './TypeMapper';
import { ObjectTypeComposer, ObjectTypeComposerDefinition } from './ObjectTypeComposer';
import { InputTypeComposer, InputTypeComposerDefinition } from './InputTypeComposer';
import { ScalarTypeComposer, ScalarTypeComposerDefinition } from './ScalarTypeComposer';
import { EnumTypeComposer, EnumTypeComposerDefinition } from './EnumTypeComposer';
import { InterfaceTypeComposer, InterfaceTypeComposerDefinition } from './InterfaceTypeComposer';
import { UnionTypeComposer, UnionTypeComposerDefinition } from './UnionTypeComposer';
import { ListComposer } from './ListComposer';
import { NonNullComposer } from './NonNullComposer';
import { ThunkComposer } from './ThunkComposer';
import { Resolver, ResolverDefinition } from './Resolver';
import { isFunction } from './utils/is';
import { inspect, forEachKey } from './utils/misc';
import { dedent } from './utils/dedent';
import {
  getGraphQLType,
  isTypeComposer,
  isNamedTypeComposer,
  isComposeNamedType,
  getComposeTypeName,
  isOutputTypeDefinitionString,
  isInputTypeDefinitionString,
  isScalarTypeDefinitionString,
  isEnumTypeDefinitionString,
  isInterfaceTypeDefinitionString,
  isUnionTypeDefinitionString,
  cloneTypeTo,
  AnyType,
  NamedTypeComposer,
  ComposeInputTypeDefinition,
  ComposeOutputTypeDefinition,
} from './utils/typeHelpers';
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLEnumType,
  GraphQLDirective,
  GraphQLSkipDirective,
  GraphQLIncludeDirective,
  GraphQLDeprecatedDirective,
  GraphQLScalarType,
  GraphQLNonNull,
  GraphQLList,
  defaultFieldResolver,
  buildSchema,
  getNamedType,
  GraphQLType,
  GraphQLNamedType,
  SchemaDefinitionNode,
  GraphQLResolveInfo,
  SchemaExtensionNode,
  GraphQLScalarTypeConfig,
} from './graphql';
import {
  printSchemaComposer,
  SchemaPrinterOptions,
  SchemaComposerPrinterOptions,
} from './utils/schemaPrinter';
import { visitSchema } from './utils/schemaVisitor';

type ExtraSchemaConfig = {
  description?: string | null;
  types?: GraphQLNamedType[] | null;
  directives?: GraphQLDirective[] | null;
  extensions?: any | null;
  astNode?: SchemaDefinitionNode | null;
  extensionASTNodes?: ReadonlyArray<SchemaExtensionNode> | null;
  /** You may pass all unused types from type registry to GraphQL schema if set this option to `true` */
  keepUnusedTypes?: boolean | null;
};

export type GraphQLToolsResolveMethods<TContext> = {
  [typeName: string]:
    | {
        [fieldName: string]:
          | ((
              source: any,
              args: Record<string, any>,
              context: TContext,
              info: GraphQLResolveInfo
            ) => any)
          | string
          | number
          | Record<string, any>;
      }
    | GraphQLNamedType
    | GraphQLScalarTypeConfig<any, any>;
};

export const BUILT_IN_DIRECTIVES = [
  GraphQLSkipDirective,
  GraphQLIncludeDirective,
  GraphQLDeprecatedDirective,
];

/**
 * `SchemaComposer` is a class which helps to create `GraphQLSchema`.
 */
export class SchemaComposer<TContext = any> extends TypeStorage<any, NamedTypeComposer<TContext>> {
  typeMapper: TypeMapper<TContext>;
  _schemaMustHaveTypes: Array<AnyType<TContext>> = [];
  _directives: Array<GraphQLDirective> = [...BUILT_IN_DIRECTIVES];
  _description: string | undefined;

  /**
   * Create SchemaComposer from
   *  - scratch
   *  - or from SDL
   *  - or from GraphQLSchema instance
   *
   * @param {undefined | GraphQLSchema | string} schema
   */
  constructor(schemaOrSDL?: GraphQLSchema | string) {
    super();
    this.typeMapper = new TypeMapper(this);

    let schema;
    if (typeof schemaOrSDL === 'string') {
      schema = buildSchema(schemaOrSDL);
    } else {
      schema = schemaOrSDL;
    }

    if (schema instanceof GraphQLSchema) {
      schema.getDirectives().forEach((directive) => {
        this.addDirective(directive);
      });
      forEachKey(schema.getTypeMap(), (v, k) => {
        // skip internal types
        if (k.startsWith('__')) return;
        // under the hood adds types to type storage
        this.typeMapper.convertGraphQLTypeToComposer(v);
      });
      const q = schema.getQueryType();
      if (q) this.set('Query', this.get(q));
      const m = schema.getMutationType();
      if (m) this.set('Mutation', this.get(m));
      const s = schema.getSubscriptionType();
      if (s) this.set('Subscription', this.get(s));
      if (schema.description) this.setDescription(schema.description);
    }
  }

  /**
   * Returns `ObjectTypeComposer` of `Query` root type.
   *
   * @example
   *     import { schemaComposer } from 'graphql-compose';
   *     schemaComposer.Query.addFields({ field1: 'String' });
   */
  get Query(): ObjectTypeComposer<any, TContext> {
    return this.getOrCreateOTC('Query');
  }

  /**
   * Returns `ObjectTypeComposer` of `Mutation` root type.
   *
   * @example
   *     import { schemaComposer } from 'graphql-compose';
   *     schemaComposer.Mutation.addFields({ field1: 'String' });
   */
  get Mutation(): ObjectTypeComposer<any, TContext> {
    return this.getOrCreateOTC('Mutation');
  }

  /**
   * Returns `ObjectTypeComposer` of `Subscription` root type.
   *
   * @example
   *     import { schemaComposer } from 'graphql-compose';
   *     schemaComposer.Subscription.addFields({ field1: 'String' });
   */
  get Subscription(): ObjectTypeComposer<any, TContext> {
    return this.getOrCreateOTC('Subscription');
  }

  /**
   * Create `GraphQLSchema` instance from defined types.
   * This instance can be provided to `express-graphql`, `apollo-server`, `graphql-yoga` etc.
   */
  buildSchema(extraConfig?: ExtraSchemaConfig): GraphQLSchema {
    const roots = {} as {
      query?: GraphQLObjectType;
      mutation?: GraphQLObjectType;
      subscription?: GraphQLObjectType;
    };

    if (this.has('Query')) {
      const tc = this.getOTC('Query');
      this.removeEmptyTypes(tc, new Set());
      roots.query = tc.getType();
    }

    if (this.has('Mutation')) {
      const tc = this.getOTC('Mutation');
      this.removeEmptyTypes(tc, new Set());
      if (tc.getFieldNames().length) {
        roots.mutation = tc.getType();
      }
    }

    if (this.has('Subscription')) {
      const tc = this.getOTC('Subscription');
      this.removeEmptyTypes(tc, new Set());
      if (tc.getFieldNames().length) {
        roots.subscription = tc.getType();
      }
    }

    const { keepUnusedTypes, ...reducedConfig } = extraConfig || {};

    const typesSet = new Set<GraphQLNamedType>();
    if (keepUnusedTypes) {
      this.types.forEach((type) => {
        typesSet.add(getNamedType(getGraphQLType(type)));
      });
    }
    // additional types, eg. used in Interfaces
    this._schemaMustHaveTypes.forEach((type) => {
      typesSet.add(getNamedType(getGraphQLType(type)));
    });
    if (Array.isArray(extraConfig?.types)) {
      extraConfig?.types.forEach((type) => {
        typesSet.add(getNamedType(getGraphQLType(type)));
      });
    }

    const directives = [
      ...this._directives,
      ...(Array.isArray(extraConfig?.directives) ? [...(extraConfig as any).directives] : []),
    ];

    const description = this.getDescription() || reducedConfig.description || undefined;

    return new GraphQLSchema({
      ...reducedConfig,
      ...roots,
      types: Array.from(typesSet),
      directives,
      description,
    });
  }

  /**
   * When using Interfaces you may have such Types which are hidden under Interface.resolveType method. In such cases you should add these types explicitly. Cause `buildSchema()` will take only real used types and types which added via `addSchemaMustHaveType()` method.
   */
  addSchemaMustHaveType(type: AnyType<TContext>): this {
    this._schemaMustHaveTypes.push(type);
    return this;
  }

  /**
   * Deeply traverse fields in Query, Mutation, Subscription & sub-objects
   * where will be removed all fields with empty object types (without sub-fields).
   */
  removeEmptyTypes(
    tc: ObjectTypeComposer<any, TContext>,
    passedTypes: Set<string> = new Set()
  ): void {
    tc.getFieldNames().forEach((fieldName) => {
      const fieldTC = tc.getFieldTC(fieldName);
      if (!fieldTC) {
        throw new Error(`fieldTC "${fieldName}" is not defined.`);
      }

      const typeName = fieldTC.getTypeName();
      if (!passedTypes.has(typeName)) {
        passedTypes.add(typeName);
        if (fieldTC instanceof ObjectTypeComposer) {
          if (fieldTC.getFieldNames().length > 0) {
            this.removeEmptyTypes(fieldTC, passedTypes);
          } else {
            console.log(
              `graphql-compose: Delete field '${tc.getTypeName()}.${fieldName}' ` +
                `with type '${fieldTC.getTypeName()}', cause it does not have fields.`
            );
            tc.removeField(fieldName);
          }
        }
      }
    });
  }

  /**
   * Clone schema with deep cloning of all its types.
   * Except Scalar types which will be the same for both schemas.
   */
  clone(): SchemaComposer<any> {
    const sc = new SchemaComposer();

    const cloneMap = new Map();
    this.forEach((type, key) => {
      sc.set(key, cloneTypeTo(type, sc, cloneMap) as any);
    });

    sc._schemaMustHaveTypes = this._schemaMustHaveTypes.map(
      (t) => cloneTypeTo(t, sc, cloneMap) as any
    );
    sc._directives = [...this._directives];

    return sc;
  }

  /**
   * Load all types from GraphQLSchema and merge with current SchemaComposer's types.
   *
   * @example
   *     import { schemaComposer } from 'graphql-compose';
   *     schemaComposer.merge(someSchema1);
   *     schemaComposer.merge(someSchema2);
   *     schemaComposer.merge(someSchema3);
   *     schemaComposer.getOTC('User').removeField('password');
   *     const newSchema = schemaComposer.buildSchema();
   */
  merge(schema: GraphQLSchema | SchemaComposer<any>): this {
    let sc: SchemaComposer<any>;
    if (schema instanceof SchemaComposer) {
      sc = schema;
    } else if (schema instanceof GraphQLSchema) {
      sc = new SchemaComposer(schema);
    } else {
      throw new Error(
        'SchemaComposer.merge() accepts only GraphQLSchema or SchemaComposer instances.'
      );
    }

    // Root types may have any name, so import them manually.
    this.Query.merge(sc.Query);
    this.Mutation.merge(sc.Mutation);
    this.Subscription.merge(sc.Subscription);

    // Merging non-root types
    sc.types.forEach((type, key) => {
      // skip internal and root types
      if (
        (typeof key === 'string' && key.startsWith('__')) ||
        type === sc.Query ||
        type === sc.Mutation ||
        type === sc.Subscription
      ) {
        return;
      }

      let typeName;
      if (isComposeNamedType(type)) {
        typeName = getComposeTypeName(type, this);
      }

      // merge regular types
      if (this.has(key)) {
        // merge by key (key prefer, cause it may be reference and types not yet resolved)
        this.getAnyTC(key).merge(type as any);
      } else if (typeName && this.has(typeName)) {
        // merge by type name (key may be different)
        this.getAnyTC(typeName).merge(type as any);
      } else {
        // add a new type
        const tc = type.cloneTo(this) as NamedTypeComposer<any>;
        this.set(key, tc);
        if (typeName && typeName !== key) {
          this.set(typeName, tc);
        }
      }
    });

    sc.getDirectives().forEach((directive) => {
      this.addDirective(directive);
    });

    return this;
  }

  getDescription(): string | undefined {
    return this._description;
  }

  setDescription(description: string | undefined): this {
    this._description = description;
    return this;
  }

  // -----------------------------------------------
  // Like graphql-tools methods
  // -----------------------------------------------

  /**
   * Add types to Schema via SDL string. Returns a Map of parsed types.
   *
   * @example
   *     const schemaComposer = new SchemaComposer();
   *     schemaComposer.addTypeDefs(`
   *       type Post {
   *         id: Int!
   *         title: String
   *         votes: Int
   *       }
   *       enum Sort {
   *         ASC
   *         DESC
   *       }
   *     `);
   *
   * @description
   * After that your added types will be available for referencing via string, eg.
   *
   * @example
   *     ObjectTypeComposer.create({
   *       name: 'Author',
   *       fields: {
   *         posts: {
   *           type: '[Post!]',
   *           args: {
   *             sort: 'Sort',
   *           },
   *           resolve: () => {},
   *         }
   *       }
   *     });
   */
  addTypeDefs(typeDefs: string): TypeStorage<string, NamedTypeComposer<any>> {
    let types: TypeStorage<string, NamedTypeComposer<TContext>>;
    try {
      types = this.typeMapper.parseTypesFromString(typeDefs);
    } catch (e: any) {
      throw new Error(e.toString());
    }

    types.forEach((type: NamedTypeComposer<any>) => {
      const name = type.getTypeName();
      if (name !== 'Query' && name !== 'Mutation' && name !== 'Subscription') {
        this.add(type);
      }
    });
    if (types.has('Query')) {
      const tc = types.get('Query');
      if (!(tc instanceof ObjectTypeComposer)) {
        throw new Error(`Type Query in typedefs isn't an Object Type.`);
      }
      this.Query.addFields(tc.getFields());
    }
    if (types.has('Mutation')) {
      const tc = types.get('Mutation');
      if (!(tc instanceof ObjectTypeComposer)) {
        throw new Error(`Type Mutation in typedefs isn't an Object Type.`);
      }
      this.Mutation.addFields(tc.getFields());
    }
    if (types.has('Subscription')) {
      const tc = types.get('Subscription');
      if (!(tc instanceof ObjectTypeComposer)) {
        throw new Error(`Type Subscription in typedefs isn't an Object Type.`);
      }
      this.Subscription.addFields(tc.getFields());
    }
    return types;
  }

  /**
   * Define `resolve` methods for Types in `graphql-tools` manner.
   *
   * @example
   *     declare function addResolveMethods(typesFieldsResolve: {
   *       [typeName: string]: {
   *         [fieldName: string]: (
   *           source: any,
   *           args: Object,
   *           context: TContext,
   *           info: GraphQLResolveInfo
   *         ) => any,
   *       },
   *     }): void
   *
   * @description
   *   More details can be found in [issue #142](https://github.com/graphql-compose/graphql-compose/issues/142).
   */
  addResolveMethods(typesFieldsResolve: GraphQLToolsResolveMethods<TContext>): void {
    const typeNames = Object.keys(typesFieldsResolve);
    typeNames.forEach((typeName) => {
      const tc = this.get(typeName);
      if (tc instanceof ScalarTypeComposer) {
        const maybeScalar: any = typesFieldsResolve[typeName];
        if (maybeScalar instanceof GraphQLScalarType) {
          tc.merge(maybeScalar);
          if (maybeScalar.name !== typeName) this.set(typeName, tc);
          return;
        } else if (
          typeof maybeScalar.name === 'string' &&
          typeof maybeScalar.serialize === 'function'
        ) {
          tc.merge(new GraphQLScalarType(maybeScalar));
          if (maybeScalar.name !== typeName) this.set(typeName, tc);
          return;
        }
      } else if (tc instanceof ObjectTypeComposer) {
        const fieldsResolve = typesFieldsResolve[typeName] as any;
        const fieldNames = Object.keys(fieldsResolve);
        fieldNames.forEach((fieldName) => {
          tc.extendField(fieldName, {
            resolve: fieldsResolve[fieldName],
          });
        });
        return;
      } else if (tc instanceof EnumTypeComposer) {
        const enumValuesMap = typesFieldsResolve[typeName] as any;
        const fieldNames = Object.keys(enumValuesMap);
        fieldNames.forEach((fieldName) => {
          tc.extendField(fieldName, {
            value: enumValuesMap[fieldName],
          });
        });
        return;
      }
      throw new Error(dedent`
        Cannot add resolver to the following type: 
          ${inspect(tc)}
      `);
    });
  }

  // -----------------------------------------------
  // Type methods
  // -----------------------------------------------

  createObjectTC<TSource = any>(
    typeDef: ObjectTypeComposerDefinition<TSource, TContext>
  ): ObjectTypeComposer<TSource, TContext> {
    return ObjectTypeComposer.create(typeDef, this);
  }

  createInputTC(typeDef: InputTypeComposerDefinition): InputTypeComposer<TContext> {
    return InputTypeComposer.create(typeDef, this);
  }

  createEnumTC(typeDef: EnumTypeComposerDefinition): EnumTypeComposer<TContext> {
    return EnumTypeComposer.create(typeDef, this);
  }

  createInterfaceTC<TSource = any>(
    typeDef: InterfaceTypeComposerDefinition<TSource, TContext>
  ): InterfaceTypeComposer<TSource, TContext> {
    return InterfaceTypeComposer.create(typeDef, this);
  }

  createUnionTC<TSource = any>(
    typeDef: UnionTypeComposerDefinition<TSource, TContext>
  ): UnionTypeComposer<TSource, TContext> {
    return UnionTypeComposer.create(typeDef, this);
  }

  createScalarTC<TInternal = any, TExternal = any>(
    typeDef: ScalarTypeComposerDefinition<TInternal, TExternal>
  ): ScalarTypeComposer<TContext> {
    return ScalarTypeComposer.create(typeDef, this);
  }

  createResolver<TSource = any, TArgs = any>(
    opts: ResolverDefinition<TSource, TContext, TArgs>
  ): Resolver<any, TContext> {
    return new Resolver<TSource, TContext, TArgs>(opts, this);
  }

  /**
   * Creates or return existed TypeComposer from SDL or object.
   * If you call this method again with same params should be returned the same TypeComposer instance.
   */
  createTC(
    typeOrSDL: ComposeOutputTypeDefinition<any> | ComposeInputTypeDefinition
  ): NamedTypeComposer<TContext> {
    if (this.has(typeOrSDL)) {
      return this.get(typeOrSDL);
    }
    const tc = isNamedTypeComposer(typeOrSDL) ? typeOrSDL : this.createTempTC(typeOrSDL);
    const typeName = tc.getTypeName();
    this.set(typeName, tc);
    this.set(typeOrSDL, tc);
    return tc;
  }

  /**
   * Creates TypeComposer from SDL or object without adding it to the type storage.
   */
  createTempTC(
    typeOrSDL: ComposeOutputTypeDefinition<any> | ComposeInputTypeDefinition
  ): NamedTypeComposer<TContext> {
    let type;
    if (typeof typeOrSDL === 'string') {
      type = this.typeMapper.convertSDLTypeDefinition(typeOrSDL);
    } else {
      type = typeOrSDL;
    }

    if (isTypeComposer(type)) {
      if (
        type instanceof NonNullComposer ||
        type instanceof ListComposer ||
        type instanceof ThunkComposer
      ) {
        const unwrappedTC = type.getUnwrappedTC();
        return unwrappedTC;
      }
      return type as any;
    } else if (type instanceof GraphQLObjectType) {
      return ObjectTypeComposer.createTemp(type, this);
    } else if (type instanceof GraphQLInputObjectType) {
      return InputTypeComposer.createTemp(type, this);
    } else if (type instanceof GraphQLScalarType) {
      return ScalarTypeComposer.createTemp(type, this);
    } else if (type instanceof GraphQLEnumType) {
      return EnumTypeComposer.createTemp(type, this);
    } else if (type instanceof GraphQLInterfaceType) {
      return InterfaceTypeComposer.createTemp(type, this);
    } else if (type instanceof GraphQLUnionType) {
      return UnionTypeComposer.createTemp(type, this);
    }

    throw new Error(dedent`
      Cannot create as TypeComposer the following value: 
        ${inspect(type)}.
    `);
  }

  /* @deprecated 8.0.0 */
  getOrCreateTC(
    typeName: string,
    onCreate?: (tc: ObjectTypeComposer<any, TContext>) => any
  ): ObjectTypeComposer<any, TContext> {
    deprecate(`Use SchemaComposer.getOrCreateOTC() method instead`);
    return this.getOrCreateOTC(typeName, onCreate);
  }

  getOrCreateOTC(
    typeName: string,
    onCreate?: (tc: ObjectTypeComposer<any, TContext>) => any
  ): ObjectTypeComposer<any, TContext> {
    try {
      return this.getOTC(typeName);
    } catch (e) {
      const tc = ObjectTypeComposer.create(typeName, this);
      this.set(typeName, tc);
      if (onCreate && isFunction(onCreate)) onCreate(tc);
      return tc;
    }
  }

  getOrCreateITC(
    typeName: string,
    onCreate?: (tc: InputTypeComposer<TContext>) => any
  ): InputTypeComposer<TContext> {
    try {
      return this.getITC(typeName);
    } catch (e) {
      const itc = InputTypeComposer.create(typeName, this);
      this.set(typeName, itc);
      if (onCreate && isFunction(onCreate)) onCreate(itc);
      return itc;
    }
  }

  getOrCreateETC(
    typeName: string,
    onCreate?: (tc: EnumTypeComposer<TContext>) => any
  ): EnumTypeComposer<TContext> {
    try {
      return this.getETC(typeName);
    } catch (e) {
      const etc = EnumTypeComposer.create(typeName, this);
      this.set(typeName, etc);
      if (onCreate && isFunction(onCreate)) onCreate(etc);
      return etc;
    }
  }

  getOrCreateIFTC(
    typeName: string,
    onCreate?: (tc: InterfaceTypeComposer<any, TContext>) => any
  ): InterfaceTypeComposer<any, TContext> {
    try {
      return this.getIFTC(typeName);
    } catch (e) {
      const iftc = InterfaceTypeComposer.create(typeName, this);
      this.set(typeName, iftc);
      if (onCreate && isFunction(onCreate)) onCreate(iftc);
      return iftc;
    }
  }

  getOrCreateUTC(
    typeName: string,
    onCreate?: (tc: UnionTypeComposer<any, TContext>) => any
  ): UnionTypeComposer<any, TContext> {
    try {
      return this.getUTC(typeName);
    } catch (e) {
      const utc = UnionTypeComposer.create(typeName, this);
      this.set(typeName, utc);
      if (onCreate && isFunction(onCreate)) onCreate(utc);
      return utc;
    }
  }

  getOrCreateSTC(
    typeName: string,
    onCreate?: (tc: ScalarTypeComposer<TContext>) => any
  ): ScalarTypeComposer<TContext> {
    try {
      return this.getSTC(typeName);
    } catch (e) {
      const stc = ScalarTypeComposer.create(typeName, this);
      this.set(typeName, stc);
      if (onCreate && isFunction(onCreate)) onCreate(stc);
      return stc;
    }
  }

  getOTC(typeName: unknown): ObjectTypeComposer<any, TContext> {
    if (this.hasInstance(typeName, GraphQLObjectType)) {
      return ObjectTypeComposer.create(this.get(typeName) as any, this);
    }
    if (this.hasInstance(typeName, ObjectTypeComposer)) {
      return this.get(typeName) as any;
    }
    throw new Error(`Cannot find ObjectTypeComposer with name ${typeName}`);
  }

  getITC(typeName: unknown): InputTypeComposer<TContext> {
    if (this.hasInstance(typeName, GraphQLInputObjectType)) {
      return InputTypeComposer.create(this.get(typeName) as any, this);
    }
    if (this.hasInstance(typeName, InputTypeComposer)) {
      return this.get(typeName) as any;
    }
    throw new Error(`Cannot find InputTypeComposer with name ${typeName}`);
  }

  getETC(typeName: unknown): EnumTypeComposer<TContext> {
    if (this.hasInstance(typeName, GraphQLEnumType)) {
      return EnumTypeComposer.create(this.get(typeName) as any, this);
    }
    if (this.hasInstance(typeName, EnumTypeComposer)) {
      return this.get(typeName) as any;
    }
    throw new Error(`Cannot find EnumTypeComposer with name ${typeName}`);
  }

  getIFTC(typeName: unknown): InterfaceTypeComposer<any, TContext> {
    if (this.hasInstance(typeName, GraphQLInterfaceType)) {
      return InterfaceTypeComposer.create(this.get(typeName) as any, this);
    }
    if (this.hasInstance(typeName, InterfaceTypeComposer)) {
      return this.get(typeName) as any;
    }
    throw new Error(`Cannot find InterfaceTypeComposer with name ${typeName}`);
  }

  getUTC(typeName: unknown): UnionTypeComposer<any, TContext> {
    if (this.hasInstance(typeName, GraphQLUnionType)) {
      return UnionTypeComposer.create(this.get(typeName) as any, this);
    }
    if (this.hasInstance(typeName, UnionTypeComposer)) {
      return this.get(typeName) as any;
    }
    throw new Error(`Cannot find UnionTypeComposer with name ${typeName}`);
  }

  getSTC(typeName: unknown): ScalarTypeComposer<TContext> {
    if (this.hasInstance(typeName, GraphQLScalarType)) {
      return ScalarTypeComposer.create(this.get(typeName) as any, this);
    }
    if (this.hasInstance(typeName, ScalarTypeComposer)) {
      return this.get(typeName) as any;
    }
    throw new Error(`Cannot find ScalarTypeComposer with name ${typeName}`);
  }

  getAnyTC(typeOrName: string | AnyType<any> | GraphQLType): NamedTypeComposer<TContext> {
    let type;
    if (typeof typeOrName === 'string') {
      type = this.get(typeOrName);
    } else {
      type = typeOrName;
    }

    if (type == null) {
      throw new Error(`Cannot find type with name ${typeOrName}`);
    } else if (isNamedTypeComposer(type)) {
      return type;
    }

    while (type instanceof GraphQLList || type instanceof GraphQLNonNull) {
      type = type.ofType;
    }

    if (type instanceof GraphQLObjectType) {
      return ObjectTypeComposer.create(type, this);
    } else if (type instanceof GraphQLInputObjectType) {
      return InputTypeComposer.create(type, this);
    } else if (type instanceof GraphQLScalarType) {
      return ScalarTypeComposer.create(type, this);
    } else if (type instanceof GraphQLEnumType) {
      return EnumTypeComposer.create(type, this);
    } else if (type instanceof GraphQLInterfaceType) {
      return InterfaceTypeComposer.create(type, this);
    } else if (type instanceof GraphQLUnionType) {
      return UnionTypeComposer.create(type, this);
    }

    throw new Error(dedent`
      Type with name ${inspect(typeOrName)} cannot be obtained as any Composer helper.
      Put something strange?
    `);
  }

  /* @deprecated 8.0.0 */
  addAsComposer(typeOrSDL: ComposeOutputTypeDefinition<any> | ComposeInputTypeDefinition): string {
    deprecate(
      'Use schemaComposer.add() method instead. From v7 all types in storage saved as TypeComposers.'
    );
    return this.add(typeOrSDL);
  }

  isObjectType(type: string | AnyType<any> | GraphQLType): boolean {
    if (typeof type === 'string' && isOutputTypeDefinitionString(type)) return true;
    if (!this.has(type)) return false;
    return this.getAnyTC(type) instanceof ObjectTypeComposer;
  }

  isInputObjectType(type: string | AnyType<any> | GraphQLType): boolean {
    if (typeof type === 'string' && isInputTypeDefinitionString(type)) return true;
    if (!this.has(type)) return false;
    return this.getAnyTC(type) instanceof InputTypeComposer;
  }

  isScalarType(type: string | AnyType<any> | GraphQLType): boolean {
    if (typeof type === 'string' && isScalarTypeDefinitionString(type)) return true;
    if (!this.has(type)) return false;
    return this.getAnyTC(type) instanceof ScalarTypeComposer;
  }

  isEnumType(type: string | AnyType<any> | GraphQLType): boolean {
    if (typeof type === 'string' && isEnumTypeDefinitionString(type)) return true;
    if (!this.has(type)) return false;
    return this.getAnyTC(type) instanceof EnumTypeComposer;
  }

  isInterfaceType(type: string | AnyType<any> | GraphQLType): boolean {
    if (typeof type === 'string' && isInterfaceTypeDefinitionString(type)) return true;
    if (!this.has(type)) return false;
    return this.getAnyTC(type) instanceof InterfaceTypeComposer;
  }

  isUnionType(type: string | AnyType<any> | GraphQLType): boolean {
    if (typeof type === 'string' && isUnionTypeDefinitionString(type)) return true;
    if (!this.has(type)) return false;
    return this.getAnyTC(type) instanceof UnionTypeComposer;
  }

  // -----------------------------------------------
  // Storage methods
  // -----------------------------------------------

  clear(): void {
    super.clear();
    this._schemaMustHaveTypes = [];
    this._directives = BUILT_IN_DIRECTIVES;
  }

  add(typeOrSDL: ComposeOutputTypeDefinition<any> | ComposeInputTypeDefinition): string {
    const tc = this.createTC(typeOrSDL);
    return tc.getTypeName();
  }

  set(key: unknown, value: NamedTypeComposer<TContext>): this {
    if (!isNamedTypeComposer(value)) {
      deprecate(
        `SchemaComposer.set() accept only TypeComposers. ` +
          `You provide with key ${inspect(key)} the following wrong value ${inspect(value)}.`
      );
    }
    super.set(key, value);
    return this;
  }

  // -----------------------------------------------
  // Directive methods
  // -----------------------------------------------

  addDirective(directive: GraphQLDirective): this {
    if (!(directive instanceof GraphQLDirective)) {
      throw new Error(dedent`
        You should provide GraphQLDirective to schemaComposer.addDirective(), but received: 
          ${inspect(directive)}
      `);
    }
    if (!this.hasDirective(directive)) {
      this._directives.push(directive);
    }
    return this;
  }

  removeDirective(directive: GraphQLDirective): this {
    this._directives = this._directives.filter((o) => o !== directive);
    return this;
  }

  getDirectives(): Array<GraphQLDirective> {
    return this._directives;
  }

  /**
   * This method is used in TypeMapper and does not throw error if directive absent
   */
  _getDirective(name: string): GraphQLDirective | undefined {
    const directives = this.getDirectives();
    return directives.find((d) => d.name === name);
  }

  getDirective(name: string): GraphQLDirective {
    const directive = this._getDirective(name);
    if (!directive) {
      throw new Error(`Directive instance with name ${name} does not exists.`);
    }
    return directive;
  }

  hasDirective(directive: string | GraphQLDirective): boolean {
    if (!directive) return false;

    if (typeof directive === 'string') {
      const name = directive.startsWith('@') ? directive.slice(1) : directive;
      return !!this._directives.find((o) => o.name === name);
    } else if (directive instanceof GraphQLDirective) {
      return !!this._directives.find((o) => o === directive);
    }

    return false;
  }

  // -----------------------------------------------
  // Misc methods
  // -----------------------------------------------

  // disable redundant noise in console.logs
  toString(): string {
    return 'SchemaComposer';
  }

  toJSON(): string {
    return 'SchemaComposer';
  }

  inspect(): string {
    return 'SchemaComposer';
  }

  /**
   * Prints SDL for any type in schema by its name.
   *
   * Can print all used sub-types if provided `deep: true` option.
   * Also you may omit some sub-types via `exclude: string[]` option.
   */
  getTypeSDL(
    typeName: string,
    opts?: SchemaPrinterOptions & {
      deep?: boolean;
      exclude?: string[];
    }
  ): string {
    return this.getAnyTC(typeName).toSDL(opts);
  }

  /**
   * Return schema as a SDL string.
   * This SDL can be used with graphql-tools and Apollo Federation.
   *
   * @param {Object} options
   * @param {String[]} options.include - add to SDL only provided types
   * @param {String[]} options.exclude - do not add provided types to SDL
   * @param {Boolean} options.omitScalars - do not add Scalar types to SDL
   * @param {Boolean} options.omitDescriptions - do not add descriptions to SDL
   * @param {Boolean} options.omitDirectiveDefinitions - do not add directives definitions to SDL
   * @param {Boolean} options.commentDescriptions - print descriptions like comments, starting with #
   * @param {Boolean} options.sortAll - sort fields, args, values, interfaces by its names. Useful for snapshot testing.
   * @param {CompareTypeComposersOption} options.sortTypes - sort types. Available options: true, false, 'GROUP_BY_TYPE'
   * @param {Boolean} options.sortFields - sort fields by name
   * @param {Boolean} options.sortArgs - sort args by name
   * @param {Boolean} options.sortInterfaces  - sort interfaces by name
   * @param {Boolean} options.sortUnions - sort union types by name
   * @param {Boolean} options.sortEnums - sort enum values by name
   */
  toSDL(options?: SchemaComposerPrinterOptions): string {
    const opts = {
      sortTypes: 'GROUP_BY_TYPE',
      ...options,
    } as SchemaComposerPrinterOptions;
    return printSchemaComposer(this, opts);
  }

  /**
   * Returns a map of resolvers for each relevant GraphQL Object Type.
   *
   * This map of Resolvers can be used with graphql-tools and Apollo Federation.
   *
   * @param {Object} options
   * @param {String[]} options.exclude - do not add resolvers from provided types
   */
  getResolveMethods(opts?: { exclude?: string[] | null }): GraphQLToolsResolveMethods<TContext> {
    const resolveMethods = {} as Record<string, any>;
    const exclude = opts?.exclude || [];
    visitSchema(this, {
      OBJECT_TYPE: (tc: ObjectTypeComposer<any, any>) => {
        const typename = tc.getTypeName();
        if (exclude.includes(typename)) return;
        forEachKey(tc.getFields(), (fc, fieldName) => {
          if (!fc.resolve || fc.resolve === defaultFieldResolver) return;
          if (!resolveMethods[typename]) resolveMethods[typename] = {};
          resolveMethods[typename][fieldName] = fc.resolve;
        });
      },
      ENUM_TYPE: (tc: EnumTypeComposer<any>) => {
        const typename = tc.getTypeName();
        if (exclude.includes(typename)) return;
        let hasDifferentIntervalValues = false;
        const internalValues = {} as Record<string, any>;
        forEachKey(tc.getFields(), (fc, fieldName) => {
          if (fc.value !== fieldName) hasDifferentIntervalValues = true;
          internalValues[fieldName] = fc.value;
        });
        if (hasDifferentIntervalValues) {
          resolveMethods[typename] = internalValues;
        }
      },
    });

    return resolveMethods;
  }
}
