/* @flow strict */
/* eslint-disable class-methods-use-this */

import deprecate from './utils/deprecate';
import { TypeStorage } from './TypeStorage';
import { TypeMapper } from './TypeMapper';
import { ObjectTypeComposer, type ObjectTypeComposerDefinition } from './ObjectTypeComposer';
import { InputTypeComposer, type InputTypeComposerDefinition } from './InputTypeComposer';
import { ScalarTypeComposer, type ScalarTypeComposerDefinition } from './ScalarTypeComposer';
import { EnumTypeComposer, type EnumTypeComposerDefinition } from './EnumTypeComposer';
import {
  InterfaceTypeComposer,
  type InterfaceTypeComposerDefinition,
} from './InterfaceTypeComposer';
import { UnionTypeComposer, type UnionTypeComposerDefinition } from './UnionTypeComposer';
import { ListComposer } from './ListComposer';
import { NonNullComposer } from './NonNullComposer';
import { ThunkComposer } from './ThunkComposer';
import { Resolver, type ResolverDefinition } from './Resolver';
import { isFunction } from './utils/is';
import { inspect, forEachKey } from './utils/misc';
import {
  getGraphQLType,
  isTypeComposer,
  isNamedTypeComposer,
  isComposeType,
  getComposeTypeName,
  type AnyType,
  type NamedTypeComposer,
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
  type GraphQLType,
  type GraphQLNamedType,
  type SchemaDefinitionNode,
  type GraphQLResolveInfo,
} from './graphql';
import DefaultDirective from './directive/default';

type ExtraSchemaConfig = {
  types?: GraphQLNamedType[] | null,
  directives?: GraphQLDirective[] | null,
  astNode?: SchemaDefinitionNode | null,
};

type GraphQLToolsResolveMethods<TContext> = {
  [typeName: string]: {
    [fieldName: string]: (
      source: any,
      args: Object,
      context: TContext,
      info: GraphQLResolveInfo
    ) => any,
  },
};

export const BUILT_IN_DIRECTIVES = [
  GraphQLSkipDirective,
  GraphQLIncludeDirective,
  GraphQLDeprecatedDirective,
  DefaultDirective,
];

export class SchemaComposer<TContext> extends TypeStorage<any, NamedTypeComposer<TContext>> {
  typeMapper: TypeMapper<TContext>;
  _schemaMustHaveTypes: Array<AnyType<TContext>> = [];
  _directives: Array<GraphQLDirective> = [...BUILT_IN_DIRECTIVES];

  constructor(schema?: GraphQLSchema): SchemaComposer<TContext> {
    super();
    this.typeMapper = new TypeMapper(this);

    if (schema instanceof GraphQLSchema) {
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
      schema.getDirectives().forEach(directive => {
        this.addDirective(directive);
      });
    }

    // alive proper Flow type casting in autosuggestions for class with Generics
    /* :: return this; */
  }

  get Query(): ObjectTypeComposer<any, TContext> {
    return this.getOrCreateOTC('Query');
  }

  get Mutation(): ObjectTypeComposer<any, TContext> {
    return this.getOrCreateOTC('Mutation');
  }

  get Subscription(): ObjectTypeComposer<any, TContext> {
    return this.getOrCreateOTC('Subscription');
  }

  buildSchema(extraConfig?: ExtraSchemaConfig): GraphQLSchema {
    const roots = {};

    if (this.has('Query')) {
      const tc = this.getOTC('Query');
      this.removeEmptyTypes(tc, new Set());
      roots.query = tc.getType();
    }

    if (this.has('Mutation')) {
      const tc = this.getOTC('Mutation');
      this.removeEmptyTypes(tc, new Set());
      roots.mutation = tc.getType();
    }

    if (this.has('Subscription')) {
      const tc = this.getOTC('Subscription');
      this.removeEmptyTypes(tc, new Set());
      roots.subscription = tc.getType();
    }

    if (!roots.query) {
      throw new Error(
        'Can not build schema. Must be initialized Query type. See https://github.com/graphql/graphql-js/issues/448'
      );
    }

    if (Object.keys(roots).length === 0) {
      throw new Error(
        'Can not build schema. Must be initialized at least one ' +
          'of the following types: Query, Mutation, Subscription.'
      );
    }

    const types = [
      ...this._schemaMustHaveTypes.map(t => (getGraphQLType(t): any)), // additional types, eg. used in Interfaces
      ...(extraConfig && Array.isArray(extraConfig.types) ? [...extraConfig.types] : []),
    ];

    const directives = [
      ...this._directives,
      ...(extraConfig && Array.isArray(extraConfig.directives) ? [...extraConfig.directives] : []),
    ];

    return new GraphQLSchema({ ...roots, ...extraConfig, types, directives });
  }

  addSchemaMustHaveType(type: AnyType<TContext>): SchemaComposer<TContext> {
    this._schemaMustHaveTypes.push(type);
    return this;
  }

  removeEmptyTypes(
    tc: ObjectTypeComposer<any, TContext>,
    passedTypes: Set<string> = new Set()
  ): void {
    tc.getFieldNames().forEach(fieldName => {
      const fieldTC = tc.getFieldTC(fieldName);
      const typeName = fieldTC.getTypeName();
      if (!passedTypes.has(typeName)) {
        passedTypes.add(typeName);
        if (fieldTC instanceof ObjectTypeComposer) {
          if (fieldTC.getFieldNames().length > 0) {
            this.removeEmptyTypes(fieldTC, passedTypes);
          } else {
            // eslint-disable-next-line
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

  merge(schema: GraphQLSchema | SchemaComposer<any>): SchemaComposer<TContext> {
    let sc;
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
      if (isComposeType(type)) {
        typeName = getComposeTypeName(type);
      }

      // merge regular types
      if (this.has(key)) {
        // merge by key (key preffer, cause it may be reference and types not yet resolved)
        this.getAnyTC(key).merge((type: any));
      } else if (typeName && this.has(typeName)) {
        // merge by type name (key may be different)
        this.getAnyTC(typeName).merge((type: any));
      } else {
        // add a new type
        const tc = this.createTC(type);
        this.set(key, tc);
        if (typeName && typeName !== key) {
          this.set(typeName, tc);
        }
      }
    });

    sc.getDirectives().forEach(directive => {
      this.addDirective(directive);
    });

    return this;
  }

  /**
   * -----------------------------------------------
   * Like graphql-tools methods
   * -----------------------------------------------
   */

  addTypeDefs(typeDefs: string): TypeStorage<string, NamedTypeComposer<any>> {
    const types = this.typeMapper.parseTypesFromString(typeDefs);
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

  addResolveMethods(typesFieldsResolve: GraphQLToolsResolveMethods<TContext>): void {
    const typeNames = Object.keys(typesFieldsResolve);
    typeNames.forEach(typeName => {
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
        const fieldsResolve = typesFieldsResolve[typeName];
        const fieldNames = Object.keys(fieldsResolve);
        fieldNames.forEach(fieldName => {
          tc.extendField(fieldName, {
            resolve: fieldsResolve[fieldName],
          });
        });
        return;
      }
      throw new Error(`Cannot add resolver to the following type ${inspect(tc)}`);
    });
  }

  /**
   * -----------------------------------------------
   * Type methods
   * -----------------------------------------------
   */

  createObjectTC(
    typeDef: ObjectTypeComposerDefinition<any, TContext>
  ): ObjectTypeComposer<any, TContext> {
    return ObjectTypeComposer.create(typeDef, this);
  }

  createInputTC(typeDef: InputTypeComposerDefinition): InputTypeComposer<TContext> {
    return InputTypeComposer.create(typeDef, this);
  }

  createEnumTC(typeDef: EnumTypeComposerDefinition): EnumTypeComposer<TContext> {
    return EnumTypeComposer.create(typeDef, this);
  }

  createInterfaceTC(
    typeDef: InterfaceTypeComposerDefinition<any, TContext>
  ): InterfaceTypeComposer<any, TContext> {
    return InterfaceTypeComposer.create(typeDef, this);
  }

  createUnionTC(
    typeDef: UnionTypeComposerDefinition<any, TContext>
  ): UnionTypeComposer<any, TContext> {
    return UnionTypeComposer.create(typeDef, this);
  }

  createScalarTC(typeDef: ScalarTypeComposerDefinition): ScalarTypeComposer<TContext> {
    return ScalarTypeComposer.create(typeDef, this);
  }

  createResolver(opts: ResolverDefinition<any, TContext>): Resolver<any, TContext> {
    return new Resolver<any, TContext, any>(opts, this);
  }

  createTC(typeOrSDL: any): NamedTypeComposer<TContext> {
    if (this.has(typeOrSDL)) {
      return this.get(typeOrSDL);
    }
    const tc = this.createTempTC(typeOrSDL);
    const typeName = tc.getTypeName();
    this.set(typeName, tc);
    this.set(typeOrSDL, tc);
    return tc;
  }

  createTempTC(typeOrSDL: any): NamedTypeComposer<TContext> {
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
        return (unwrappedTC: any);
      }
      return type;
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

    throw new Error(`Cannot create as TypeComposer the following value: ${inspect(type)}.`);
  }

  /* @deprecated 8.0.0 */
  getOrCreateTC(
    typeName: string,
    onCreate?: (ObjectTypeComposer<any, TContext>) => any
  ): ObjectTypeComposer<any, TContext> {
    deprecate(`Use SchemaComposer.getOrCreateOTC() method instead`);
    return this.getOrCreateOTC(typeName, onCreate);
  }

  getOrCreateOTC(
    typeName: string,
    onCreate?: (ObjectTypeComposer<any, TContext>) => any
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
    onCreate?: (InputTypeComposer<TContext>) => any
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
    onCreate?: (EnumTypeComposer<TContext>) => any
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
    onCreate?: (InterfaceTypeComposer<any, TContext>) => any
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
    onCreate?: (UnionTypeComposer<any, TContext>) => any
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
    onCreate?: (ScalarTypeComposer<TContext>) => any
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

  getOTC(typeName: any): ObjectTypeComposer<any, TContext> {
    if (this.hasInstance(typeName, GraphQLObjectType)) {
      return ObjectTypeComposer.create((this.get(typeName): any), this);
    }
    if (this.hasInstance(typeName, ObjectTypeComposer)) {
      return (this.get(typeName): any);
    }
    throw new Error(`Cannot find ObjectTypeComposer with name ${typeName}`);
  }

  getITC(typeName: any): InputTypeComposer<TContext> {
    if (this.hasInstance(typeName, GraphQLInputObjectType)) {
      return InputTypeComposer.create((this.get(typeName): any), this);
    }
    if (this.hasInstance(typeName, InputTypeComposer)) {
      return (this.get(typeName): any);
    }
    throw new Error(`Cannot find InputTypeComposer with name ${typeName}`);
  }

  getETC(typeName: any): EnumTypeComposer<TContext> {
    if (this.hasInstance(typeName, GraphQLEnumType)) {
      return EnumTypeComposer.create((this.get(typeName): any), this);
    }
    if (this.hasInstance(typeName, EnumTypeComposer)) {
      return (this.get(typeName): any);
    }
    throw new Error(`Cannot find EnumTypeComposer with name ${typeName}`);
  }

  getIFTC(typeName: any): InterfaceTypeComposer<any, TContext> {
    if (this.hasInstance(typeName, GraphQLInterfaceType)) {
      return InterfaceTypeComposer.create((this.get(typeName): any), this);
    }
    if (this.hasInstance(typeName, InterfaceTypeComposer)) {
      return (this.get(typeName): any);
    }
    throw new Error(`Cannot find InterfaceTypeComposer with name ${typeName}`);
  }

  getUTC(typeName: any): UnionTypeComposer<any, TContext> {
    if (this.hasInstance(typeName, GraphQLUnionType)) {
      return UnionTypeComposer.create((this.get(typeName): any), this);
    }
    if (this.hasInstance(typeName, UnionTypeComposer)) {
      return (this.get(typeName): any);
    }
    throw new Error(`Cannot find UnionTypeComposer with name ${typeName}`);
  }

  getSTC(typeName: any): ScalarTypeComposer<TContext> {
    if (this.hasInstance(typeName, GraphQLScalarType)) {
      return ScalarTypeComposer.create((this.get(typeName): any), this);
    }
    if (this.hasInstance(typeName, ScalarTypeComposer)) {
      return (this.get(typeName): any);
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
      throw new Error(`Cannot find type with name ${(typeOrName: any)}`);
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

    throw new Error(
      `Type with name ${inspect(
        typeOrName
      )} cannot be obtained as any Composer helper. Put something strange?`
    );
  }

  /* @deprecated 8.0.0 */
  addAsComposer(typeOrSDL: mixed): string {
    deprecate(
      'Use schemaComposer.add() method instead. From v7 all types in storage saved as TypeComposers.'
    );
    return this.add(typeOrSDL);
  }

  /**
   * -----------------------------------------------
   * Storage methods
   * -----------------------------------------------
   */

  clear(): void {
    super.clear();
    this._schemaMustHaveTypes = [];
    this._directives = BUILT_IN_DIRECTIVES;
  }

  add(typeOrSDL: mixed): string {
    const tc = this.createTC(typeOrSDL);
    return tc.getTypeName();
  }

  set(key: any, value: NamedTypeComposer<TContext>): SchemaComposer<TContext> {
    if (!isNamedTypeComposer(value)) {
      // eslint-disable-next-line
      deprecate(
        `SchemaComposer.set() accept only TypeComposers. ` +
          `You provide with key ${inspect(key)} the following wrong value ${inspect(value)}.`
      );
    }
    super.set(key, value);
    return this;
  }

  /**
   * -----------------------------------------------
   * Directive methods
   * -----------------------------------------------
   */

  addDirective(directive: GraphQLDirective): SchemaComposer<TContext> {
    if (!(directive instanceof GraphQLDirective)) {
      throw new Error(
        `You should provide GraphQLDirective to schemaComposer.addDirective(), but recieved ${inspect(
          directive
        )}`
      );
    }
    if (!this.hasDirective(directive)) {
      this._directives.push(directive);
    }
    return this;
  }

  removeDirective(directive: GraphQLDirective): SchemaComposer<TContext> {
    this._directives = this._directives.filter(o => o !== directive);
    return this;
  }

  getDirectives(): Array<GraphQLDirective> {
    return this._directives;
  }

  /**
   * This method used in TypeMapper and for fast parsing
   */
  _getDirective(name: string): ?GraphQLDirective {
    const directives = this.getDirectives();
    return directives.find(d => d.name === name);
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
      return !!this._directives.find(o => o.name === name);
    } else if (directive instanceof GraphQLDirective) {
      return !!this._directives.find(o => o === directive);
    }

    return false;
  }

  /**
   * -----------------------------------------------
   * Misc methods
   * -----------------------------------------------
   */

  // disable redundant noise in console.logs
  toString(): string {
    return 'SchemaComposer';
  }

  toJSON() {
    return 'SchemaComposer';
  }

  inspect() {
    return 'SchemaComposer';
  }
}
