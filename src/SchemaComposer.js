/* @flow strict */
/* eslint-disable class-methods-use-this */

import { TypeStorage } from './TypeStorage';
import { TypeMapper } from './TypeMapper';
import { TypeComposer, type TypeComposerDefinition } from './TypeComposer';
import { InputTypeComposer, type InputTypeComposerDefinition } from './InputTypeComposer';
import { ScalarTypeComposer, type ScalarTypeComposerDefinition } from './ScalarTypeComposer';
import { EnumTypeComposer, type EnumTypeComposerDefinition } from './EnumTypeComposer';
import {
  InterfaceTypeComposer,
  type InterfaceTypeComposerDefinition,
} from './InterfaceTypeComposer';
import { UnionTypeComposer, type UnionTypeComposerDefinition } from './UnionTypeComposer';
import { Resolver, type ResolverOpts } from './Resolver';
import { isFunction } from './utils/is';
import { inspect } from './utils/misc';
import { getGraphQLType } from './utils/typeHelpers';
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
  type GraphQLNamedType,
  type SchemaDefinitionNode,
  type GraphQLResolveInfo,
} from './graphql';

type ExtraSchemaConfig = {
  types?: ?Array<GraphQLNamedType>,
  directives?: ?Array<GraphQLDirective>,
  astNode?: ?SchemaDefinitionNode,
};

type MustHaveTypes<TContext> =
  | TypeComposer<any, TContext>
  | InputTypeComposer
  | EnumTypeComposer
  | InterfaceTypeComposer<any, TContext>
  | UnionTypeComposer<any, TContext>
  | ScalarTypeComposer
  | GraphQLNamedType;

type AddResolveMethods<TContext> = {
  [typeName: string]: {
    [fieldName: string]: (
      source: any,
      args: Object,
      context: TContext,
      info: GraphQLResolveInfo
    ) => any,
  },
};

const BUILT_IN_DIRECTIVES = [
  GraphQLSkipDirective,
  GraphQLIncludeDirective,
  GraphQLDeprecatedDirective,
];

export class SchemaComposer<TContext> extends TypeStorage<any, any> {
  typeMapper: TypeMapper<TContext>;
  _schemaMustHaveTypes: Array<MustHaveTypes<TContext>> = [];
  _directives: Array<GraphQLDirective> = BUILT_IN_DIRECTIVES;

  constructor(): SchemaComposer<TContext> {
    super();
    this.typeMapper = new TypeMapper(this);

    // alive proper Flow type casting in autosuggestions
    /* :: return this; */
  }

  get Query(): TypeComposer<any, TContext> {
    return this.rootQuery();
  }

  rootQuery(): TypeComposer<any, TContext> {
    return this.getOrCreateTC('Query');
  }

  get Mutation(): TypeComposer<any, TContext> {
    return this.rootMutation();
  }

  rootMutation(): TypeComposer<any, TContext> {
    return this.getOrCreateTC('Mutation');
  }

  get Subscription(): TypeComposer<any, TContext> {
    return this.rootSubscription();
  }

  rootSubscription(): TypeComposer<any, TContext> {
    return this.getOrCreateTC('Subscription');
  }

  buildSchema(extraConfig?: ExtraSchemaConfig): GraphQLSchema {
    const roots = {};

    if (this.has('Query')) {
      const tc = this.getTC('Query');
      this.removeEmptyTypes(tc, new Set());
      roots.query = tc.getType();
    }

    if (this.has('Mutation')) {
      const tc = this.getTC('Mutation');
      this.removeEmptyTypes(tc, new Set());
      roots.mutation = tc.getType();
    }

    if (this.has('Subscription')) {
      const tc = this.getTC('Subscription');
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

  addSchemaMustHaveType(type: MustHaveTypes<TContext>): SchemaComposer<TContext> {
    this._schemaMustHaveTypes.push(type);
    return this;
  }

  removeEmptyTypes(
    typeComposer: TypeComposer<any, TContext>,
    passedTypes: Set<string> = new Set()
  ) {
    typeComposer.getFieldNames().forEach(fieldName => {
      const fieldType = typeComposer.getFieldType(fieldName);
      if (fieldType instanceof GraphQLObjectType) {
        const typeName = fieldType.name;
        if (!passedTypes.has(typeName)) {
          passedTypes.add(typeName);
          const tc = new TypeComposer(fieldType, this);
          if (Object.keys(tc.getFields()).length > 0) {
            this.removeEmptyTypes(tc, passedTypes);
          } else {
            // eslint-disable-next-line
            console.log(
              `graphql-compose: Delete field '${typeComposer.getTypeName()}.${fieldName}' ` +
                `with type '${tc.getTypeName()}', cause it does not have fields.`
            );
            typeComposer.removeField(fieldName);
          }
        }
      }
    });
  }

  getOrCreateTC(
    typeName: string,
    onCreate?: (TypeComposer<any, TContext>) => any
  ): TypeComposer<any, TContext> {
    try {
      return this.getTC(typeName);
    } catch (e) {
      const tc = TypeComposer.create(typeName, this);
      this.set(typeName, tc);
      if (onCreate && isFunction(onCreate)) onCreate(tc);
      return tc;
    }
  }

  getOrCreateITC(typeName: string, onCreate?: InputTypeComposer => any): InputTypeComposer {
    try {
      return this.getITC(typeName);
    } catch (e) {
      const itc = InputTypeComposer.create(typeName, this);
      this.set(typeName, itc);
      if (onCreate && isFunction(onCreate)) onCreate(itc);
      return itc;
    }
  }

  getOrCreateETC(typeName: string, onCreate?: EnumTypeComposer => any): EnumTypeComposer {
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

  getOrCreateSTC(typeName: string, onCreate?: ScalarTypeComposer => any): ScalarTypeComposer {
    try {
      return this.getSTC(typeName);
    } catch (e) {
      const stc = ScalarTypeComposer.create(typeName, this);
      this.set(typeName, stc);
      if (onCreate && isFunction(onCreate)) onCreate(stc);
      return stc;
    }
  }

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

  clear(): void {
    super.clear();
    this._schemaMustHaveTypes = [];
    this._directives = BUILT_IN_DIRECTIVES;
  }

  getTC(typeName: any): TypeComposer<any, TContext> {
    if (this.hasInstance(typeName, GraphQLObjectType)) {
      return TypeComposer.create((this.get(typeName): any), this);
    }
    if (this.hasInstance(typeName, TypeComposer)) {
      return (this.get(typeName): any);
    }
    throw new Error(`Cannot find TypeComposer with name ${typeName}`);
  }

  getITC(typeName: any): InputTypeComposer {
    if (this.hasInstance(typeName, GraphQLInputObjectType)) {
      return InputTypeComposer.create((this.get(typeName): any), this);
    }
    if (this.hasInstance(typeName, InputTypeComposer)) {
      return (this.get(typeName): any);
    }
    throw new Error(`Cannot find InputTypeComposer with name ${typeName}`);
  }

  getETC(typeName: any): EnumTypeComposer {
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

  getSTC(typeName: any): ScalarTypeComposer {
    if (this.hasInstance(typeName, GraphQLScalarType)) {
      return ScalarTypeComposer.create((this.get(typeName): any), this);
    }
    if (this.hasInstance(typeName, ScalarTypeComposer)) {
      return (this.get(typeName): any);
    }
    throw new Error(`Cannot find ScalarTypeComposer with name ${typeName}`);
  }

  getAnyTC(
    typeName: any
  ):
    | TypeComposer<any, TContext>
    | InputTypeComposer
    | EnumTypeComposer
    | InterfaceTypeComposer<any, TContext>
    | UnionTypeComposer<any, TContext>
    | ScalarTypeComposer {
    const type = this.get(typeName);
    if (
      type instanceof TypeComposer ||
      type instanceof InputTypeComposer ||
      type instanceof ScalarTypeComposer ||
      type instanceof EnumTypeComposer ||
      type instanceof InterfaceTypeComposer ||
      type instanceof UnionTypeComposer
    ) {
      return type;
    } else if (type instanceof GraphQLObjectType) {
      return TypeComposer.create(type, this);
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
        typeName
      )} cannot be obtained as any Composer helper. Put something strange?`
    );
  }

  add(typeOrSDL: mixed): ?string {
    if (typeof typeOrSDL === 'string') {
      return this.addAsComposer(typeOrSDL);
    } else {
      return super.add((typeOrSDL: any));
    }
  }

  addAsComposer(typeOrSDL: mixed): string {
    let type;
    if (typeof typeOrSDL === 'string') {
      type = this.typeMapper.createType(typeOrSDL);
    } else {
      type = typeOrSDL;
    }

    if (
      type instanceof TypeComposer ||
      type instanceof InputTypeComposer ||
      type instanceof ScalarTypeComposer ||
      type instanceof EnumTypeComposer ||
      type instanceof InterfaceTypeComposer ||
      type instanceof UnionTypeComposer
    ) {
      const name = type.getTypeName();
      this.set(name, type);
      return name;
    } else if (type instanceof GraphQLObjectType) {
      return TypeComposer.create(type, this).getTypeName();
    } else if (type instanceof GraphQLInputObjectType) {
      return InputTypeComposer.create(type, this).getTypeName();
    } else if (type instanceof GraphQLScalarType) {
      return ScalarTypeComposer.create(type, this).getTypeName();
    } else if (type instanceof GraphQLEnumType) {
      return EnumTypeComposer.create(type, this).getTypeName();
    } else if (type instanceof GraphQLInterfaceType) {
      return InterfaceTypeComposer.create(type, this).getTypeName();
    } else if (type instanceof GraphQLUnionType) {
      return UnionTypeComposer.create(type, this).getTypeName();
    }

    throw new Error(`Cannot add as Composer type following value: ${inspect(type)}.`);
  }

  addTypeDefs(typeDefs: string): TypeStorage<string, GraphQLNamedType> {
    const types = this.typeMapper.parseTypesFromString(typeDefs);
    types.forEach((type: any) => {
      const name = type.name;
      if (name !== 'Query' && name !== 'Mutation' && name !== 'Subscription') {
        this.add((type: any));
      }
    });
    if (types.has('Query')) {
      this.Query.addFields(TypeComposer.create((types.get('Query'): any), this).getFields());
    }
    if (types.has('Mutation')) {
      this.Mutation.addFields(TypeComposer.create((types.get('Mutation'): any), this).getFields());
    }
    if (types.has('Subscription')) {
      this.Subscription.addFields(
        TypeComposer.create((types.get('Subscription'): any), this).getFields()
      );
    }
    return types;
  }

  addResolveMethods(typesFieldsResolve: AddResolveMethods<TContext>): void {
    const typeNames = Object.keys(typesFieldsResolve);
    typeNames.forEach(typeName => {
      if (this.get(typeName) instanceof GraphQLScalarType) {
        const maybeScalar: any = typesFieldsResolve[typeName];
        if (maybeScalar instanceof GraphQLScalarType) {
          this.set(typeName, maybeScalar);
          return;
        }
        if (typeof maybeScalar.name === 'string' && typeof maybeScalar.serialize === 'function') {
          this.set(typeName, new GraphQLScalarType(maybeScalar));
          return;
        }
      }
      const tc = this.getTC(typeName);
      const fieldsResolve = typesFieldsResolve[typeName];
      const fieldNames = Object.keys(fieldsResolve);
      fieldNames.forEach(fieldName => {
        tc.extendField(fieldName, {
          resolve: fieldsResolve[fieldName],
        });
      });
    });
  }

  // alias for createObjectTC
  createTC(typeDef: TypeComposerDefinition<any, TContext>): TypeComposer<any, TContext> {
    return this.createObjectTC(typeDef);
  }

  // alias for createObjectTC
  createOutputTC(typeDef: TypeComposerDefinition<any, TContext>): TypeComposer<any, TContext> {
    return this.createObjectTC(typeDef);
  }

  createObjectTC(typeDef: TypeComposerDefinition<any, TContext>): TypeComposer<any, TContext> {
    return TypeComposer.create(typeDef, this);
  }

  createInputTC(typeDef: InputTypeComposerDefinition): InputTypeComposer {
    return InputTypeComposer.create(typeDef, this);
  }

  createEnumTC(typeDef: EnumTypeComposerDefinition): EnumTypeComposer {
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

  createScalarTC(typeDef: ScalarTypeComposerDefinition): ScalarTypeComposer {
    return ScalarTypeComposer.create(typeDef, this);
  }

  createResolver(opts: ResolverOpts<any, any, any>): Resolver<any, TContext, any> {
    return new Resolver<any, TContext, any>(opts, this);
  }

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
}
