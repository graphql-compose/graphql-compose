/* @flow strict */
/* eslint-disable class-methods-use-this */

import { TypeStorage } from './TypeStorage';
import { TypeMapper } from './TypeMapper';
import { TypeComposer as _TypeComposer, type TypeComposerDefinition } from './TypeComposer';
import {
  InputTypeComposer as _InputTypeComposer,
  type InputTypeComposerDefinition,
} from './InputTypeComposer';
import {
  ScalarTypeComposer as _ScalarTypeComposer,
  type ScalarTypeComposerDefinition,
} from './ScalarTypeComposer';
import {
  EnumTypeComposer as _EnumTypeComposer,
  type EnumTypeComposerDefinition,
} from './EnumTypeComposer';
import {
  InterfaceTypeComposer as _InterfaceTypeComposer,
  type InterfaceTypeComposerDefinition,
} from './InterfaceTypeComposer';
import {
  UnionTypeComposer as _UnionTypeComposer,
  type UnionTypeComposerDefinition,
} from './UnionTypeComposer';
import { Resolver as _Resolver } from './Resolver';
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
  | _TypeComposer<TContext>
  | _InputTypeComposer
  | _EnumTypeComposer
  | _InterfaceTypeComposer<TContext>
  | _UnionTypeComposer<TContext>
  | _ScalarTypeComposer
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

export class SchemaComposer<TContext> extends TypeStorage<TContext> {
  typeMapper: TypeMapper<TContext>;
  TypeComposer: Class<_TypeComposer<TContext>>;
  InputTypeComposer: typeof _InputTypeComposer;
  EnumTypeComposer: typeof _EnumTypeComposer;
  InterfaceTypeComposer: Class<_InterfaceTypeComposer<TContext>>;
  UnionTypeComposer: Class<_UnionTypeComposer<TContext>>;
  ScalarTypeComposer: typeof _ScalarTypeComposer;
  Resolver: Class<_Resolver<any, TContext>>;
  _schemaMustHaveTypes: Array<MustHaveTypes<TContext>> = [];
  _directives: Array<GraphQLDirective> = BUILT_IN_DIRECTIVES;

  constructor(): SchemaComposer<TContext> {
    super();
    const schema = this;

    class TypeComposer extends _TypeComposer<TContext> {
      static schemaComposer = schema;
    }
    this.TypeComposer = TypeComposer;

    class InputTypeComposer extends _InputTypeComposer {
      static schemaComposer = schema;
    }
    this.InputTypeComposer = InputTypeComposer;

    class Resolver extends _Resolver<any, TContext> {
      static schemaComposer = schema;
    }
    this.Resolver = Resolver;

    class EnumTypeComposer extends _EnumTypeComposer {
      static schemaComposer = schema;
    }
    this.EnumTypeComposer = EnumTypeComposer;

    class InterfaceTypeComposer extends _InterfaceTypeComposer<TContext> {
      static schemaComposer = schema;
    }
    this.InterfaceTypeComposer = InterfaceTypeComposer;

    class UnionTypeComposer extends _UnionTypeComposer<TContext> {
      static schemaComposer = schema;
    }
    this.UnionTypeComposer = UnionTypeComposer;

    class ScalarTypeComposer extends _ScalarTypeComposer {
      static schemaComposer = schema;
    }
    this.ScalarTypeComposer = ScalarTypeComposer;

    this.typeMapper = new TypeMapper(schema);

    // alive proper Flow type casting in autosuggestions
    /* :: return this; */
  }

  get Query(): _TypeComposer<TContext> {
    return this.rootQuery();
  }

  rootQuery(): _TypeComposer<TContext> {
    return this.getOrCreateTC('Query');
  }

  get Mutation(): _TypeComposer<TContext> {
    return this.rootMutation();
  }

  rootMutation(): _TypeComposer<TContext> {
    return this.getOrCreateTC('Mutation');
  }

  get Subscription(): _TypeComposer<TContext> {
    return this.rootSubscription();
  }

  rootSubscription(): _TypeComposer<TContext> {
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

  removeEmptyTypes(typeComposer: _TypeComposer<TContext>, passedTypes: Set<string> = new Set()) {
    typeComposer.getFieldNames().forEach(fieldName => {
      const fieldType = typeComposer.getFieldType(fieldName);
      if (fieldType instanceof GraphQLObjectType) {
        const typeName = fieldType.name;
        if (!passedTypes.has(typeName)) {
          passedTypes.add(typeName);
          const tc = new this.TypeComposer(fieldType);
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
    onCreate?: (_TypeComposer<TContext>) => any
  ): _TypeComposer<TContext> {
    try {
      return this.getTC(typeName);
    } catch (e) {
      const tc = this.TypeComposer.create(typeName);
      this.set(typeName, tc);
      if (onCreate && isFunction(onCreate)) onCreate(tc);
      return tc;
    }
  }

  getOrCreateITC(typeName: string, onCreate?: _InputTypeComposer => any): _InputTypeComposer {
    try {
      return this.getITC(typeName);
    } catch (e) {
      const itc = this.InputTypeComposer.create(typeName);
      this.set(typeName, itc);
      if (onCreate && isFunction(onCreate)) onCreate(itc);
      return itc;
    }
  }

  getOrCreateETC(typeName: string, onCreate?: _EnumTypeComposer => any): _EnumTypeComposer {
    try {
      return this.getETC(typeName);
    } catch (e) {
      const etc = this.EnumTypeComposer.create(typeName);
      this.set(typeName, etc);
      if (onCreate && isFunction(onCreate)) onCreate(etc);
      return etc;
    }
  }

  getOrCreateIFTC(
    typeName: string,
    onCreate?: (_InterfaceTypeComposer<TContext>) => any
  ): _InterfaceTypeComposer<TContext> {
    try {
      return this.getIFTC(typeName);
    } catch (e) {
      const iftc = this.InterfaceTypeComposer.create(typeName);
      this.set(typeName, iftc);
      if (onCreate && isFunction(onCreate)) onCreate(iftc);
      return iftc;
    }
  }

  getOrCreateUTC(
    typeName: string,
    onCreate?: (_UnionTypeComposer<TContext>) => any
  ): _UnionTypeComposer<TContext> {
    try {
      return this.getUTC(typeName);
    } catch (e) {
      const iftc = this.UnionTypeComposer.create(typeName);
      this.set(typeName, iftc);
      if (onCreate && isFunction(onCreate)) onCreate(iftc);
      return iftc;
    }
  }

  getOrCreateSTC(typeName: string, onCreate?: _ScalarTypeComposer => any): _ScalarTypeComposer {
    try {
      return this.getSTC(typeName);
    } catch (e) {
      const stc = this.ScalarTypeComposer.create(typeName);
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

  getTC(typeName: any): _TypeComposer<TContext> {
    if (this.hasInstance(typeName, GraphQLObjectType)) {
      return this.TypeComposer.create((this.get(typeName): any));
    }
    return super.getTC(typeName);
  }

  getITC(typeName: any): _InputTypeComposer {
    if (this.hasInstance(typeName, GraphQLInputObjectType)) {
      return this.InputTypeComposer.create((this.get(typeName): any));
    }
    return super.getITC(typeName);
  }

  getETC(typeName: any): _EnumTypeComposer {
    if (this.hasInstance(typeName, GraphQLEnumType)) {
      return this.EnumTypeComposer.create((this.get(typeName): any));
    }
    return super.getETC(typeName);
  }

  getIFTC(typeName: any): _InterfaceTypeComposer<TContext> {
    if (this.hasInstance(typeName, GraphQLInterfaceType)) {
      return this.InterfaceTypeComposer.create((this.get(typeName): any));
    }
    return super.getIFTC(typeName);
  }

  getUTC(typeName: any): _UnionTypeComposer<TContext> {
    if (this.hasInstance(typeName, GraphQLUnionType)) {
      return this.UnionTypeComposer.create((this.get(typeName): any));
    }
    return super.getUTC(typeName);
  }

  getSTC(typeName: any): _ScalarTypeComposer {
    if (this.hasInstance(typeName, GraphQLScalarType)) {
      return this.ScalarTypeComposer.create((this.get(typeName): any));
    }
    return super.getSTC(typeName);
  }

  getAnyTC(
    typeName: any
  ):
    | _TypeComposer<TContext>
    | _InputTypeComposer
    | _EnumTypeComposer
    | _InterfaceTypeComposer<TContext>
    | _UnionTypeComposer<TContext>
    | _ScalarTypeComposer {
    const type = this.get(typeName);
    if (
      type instanceof _TypeComposer ||
      type instanceof _InputTypeComposer ||
      type instanceof _ScalarTypeComposer ||
      type instanceof _EnumTypeComposer ||
      type instanceof _InterfaceTypeComposer ||
      type instanceof _UnionTypeComposer
    ) {
      return type;
    } else if (type instanceof GraphQLObjectType) {
      return this.TypeComposer.create(type);
    } else if (type instanceof GraphQLInputObjectType) {
      return this.InputTypeComposer.create(type);
    } else if (type instanceof GraphQLScalarType) {
      return this.ScalarTypeComposer.create(type);
    } else if (type instanceof GraphQLEnumType) {
      return this.EnumTypeComposer.create(type);
    } else if (type instanceof GraphQLInterfaceType) {
      return this.InterfaceTypeComposer.create(type);
    } else if (type instanceof GraphQLUnionType) {
      return this.UnionTypeComposer.create(type);
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
      type instanceof _TypeComposer ||
      type instanceof _InputTypeComposer ||
      type instanceof _ScalarTypeComposer ||
      type instanceof _EnumTypeComposer ||
      type instanceof _InterfaceTypeComposer ||
      type instanceof _UnionTypeComposer
    ) {
      const name = type.getTypeName();
      this.set(name, type);
      return name;
    } else if (type instanceof GraphQLObjectType) {
      return this.TypeComposer.create(type).getTypeName();
    } else if (type instanceof GraphQLInputObjectType) {
      return this.InputTypeComposer.create(type).getTypeName();
    } else if (type instanceof GraphQLScalarType) {
      return this.ScalarTypeComposer.create(type).getTypeName();
    } else if (type instanceof GraphQLEnumType) {
      return this.EnumTypeComposer.create(type).getTypeName();
    } else if (type instanceof GraphQLInterfaceType) {
      return this.InterfaceTypeComposer.create(type).getTypeName();
    } else if (type instanceof GraphQLUnionType) {
      return this.UnionTypeComposer.create(type).getTypeName();
    }

    throw new Error(`Cannot add as Composer type following value: ${inspect(type)}.`);
  }

  addTypeDefs(typeDefs: string): TypeStorage<GraphQLNamedType> {
    const types = this.typeMapper.parseTypesFromString(typeDefs);
    types.forEach((type: any) => {
      const name = type.name;
      if (name !== 'Query' && name !== 'Mutation' && name !== 'Subscription') {
        this.add((type: any));
      }
    });
    if (types.has('Query')) {
      this.Query.addFields(this.TypeComposer.create((types.get('Query'): any)).getFields());
    }
    if (types.has('Mutation')) {
      this.Mutation.addFields(this.TypeComposer.create((types.get('Mutation'): any)).getFields());
    }
    if (types.has('Subscription')) {
      this.Subscription.addFields(
        this.TypeComposer.create((types.get('Subscription'): any)).getFields()
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
  createTC(typeDef: TypeComposerDefinition<TContext>): _TypeComposer<TContext> {
    return this.createObjectTC(typeDef);
  }

  createObjectTC(typeDef: TypeComposerDefinition<TContext>): _TypeComposer<TContext> {
    return this.TypeComposer.create(typeDef);
  }

  createInputTC(typeDef: InputTypeComposerDefinition): _InputTypeComposer {
    return this.InputTypeComposer.create(typeDef);
  }

  createEnumTC(typeDef: EnumTypeComposerDefinition): _EnumTypeComposer {
    return this.EnumTypeComposer.create(typeDef);
  }

  createInterfaceTC(
    typeDef: InterfaceTypeComposerDefinition<TContext>
  ): _InterfaceTypeComposer<TContext> {
    return this.InterfaceTypeComposer.create(typeDef);
  }

  createUnionTC(typeDef: UnionTypeComposerDefinition<TContext>): _UnionTypeComposer<TContext> {
    return this.UnionTypeComposer.create(typeDef);
  }

  createScalarTC(typeDef: ScalarTypeComposerDefinition): _ScalarTypeComposer {
    return this.ScalarTypeComposer.create(typeDef);
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
