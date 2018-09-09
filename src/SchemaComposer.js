/* @flow strict */
/* eslint-disable class-methods-use-this */

import { GraphQLObjectType, GraphQLSchema } from './graphql';
import { TypeStorage } from './TypeStorage';
import { TypeMapper } from './TypeMapper';
import { TypeComposer as _TypeComposer } from './TypeComposer';
import { InputTypeComposer as _InputTypeComposer } from './InputTypeComposer';
import { EnumTypeComposer as _EnumTypeComposer } from './EnumTypeComposer';
import { InterfaceTypeComposer as _InterfaceTypeComposer } from './InterfaceTypeComposer';
import { Resolver as _Resolver } from './Resolver';
import { isFunction } from './utils/is';
import { getGraphQLType } from './utils/typeHelpers';
import type { GraphQLNamedType, GraphQLDirective, SchemaDefinitionNode } from './graphql';

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
  | GraphQLNamedType;

export class SchemaComposer<TContext> extends TypeStorage<TContext> {
  typeMapper: TypeMapper<TContext>;
  TypeComposer: Class<_TypeComposer<TContext>>;
  InputTypeComposer: typeof _InputTypeComposer;
  EnumTypeComposer: typeof _EnumTypeComposer;
  InterfaceTypeComposer: Class<_InterfaceTypeComposer<TContext>>;
  Resolver: Class<_Resolver<any, TContext>>;
  _schemaMustHaveTypes: Array<MustHaveTypes<TContext>> = [];

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

    return new GraphQLSchema({ ...roots, ...extraConfig, types });
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
    if (!this.hasInstance(typeName, _TypeComposer)) {
      const tc = this.TypeComposer.create(typeName);
      this.set(typeName, tc);
      if (onCreate && isFunction(onCreate)) onCreate(tc);
    }
    return (this.get(typeName): any);
  }

  getOrCreateITC(typeName: string, onCreate?: _InputTypeComposer => any): _InputTypeComposer {
    if (!this.hasInstance(typeName, _InputTypeComposer)) {
      const itc = this.InputTypeComposer.create(typeName);
      this.set(typeName, itc);
      if (onCreate && isFunction(onCreate)) onCreate(itc);
    }
    return (this.get(typeName): any);
  }

  getOrCreateETC(typeName: string, onCreate?: _EnumTypeComposer => any): _EnumTypeComposer {
    if (!this.hasInstance(typeName, _EnumTypeComposer)) {
      const etc = this.EnumTypeComposer.create(typeName);
      this.set(typeName, etc);
      if (onCreate && isFunction(onCreate)) onCreate(etc);
    }
    return (this.get(typeName): any);
  }

  getOrCreateIFTC(
    typeName: string,
    onCreate?: (_InterfaceTypeComposer<TContext>) => any
  ): _InterfaceTypeComposer<TContext> {
    if (!this.hasInstance(typeName, _InterfaceTypeComposer)) {
      const iftc = this.InterfaceTypeComposer.create(typeName);
      this.set(typeName, iftc);
      if (onCreate && isFunction(onCreate)) onCreate(iftc);
    }
    return (this.get(typeName): any);
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
  }
}
