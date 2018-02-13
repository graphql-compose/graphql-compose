/* @flow strict */
/* eslint-disable class-methods-use-this */

import { GraphQLObjectType, GraphQLSchema, type GraphQLNamedType } from './graphql';
import { TypeStorage } from './typeStorage';
import { TypeMapper } from './typeMapper';
import { TypeComposer as _TypeComposer } from './typeComposer';
import { InputTypeComposer as _InputTypeComposer } from './inputTypeComposer';
import { EnumTypeComposer as _EnumTypeComposer } from './enumTypeComposer';
import { Resolver as _Resolver } from './resolver';

export class SchemaComposer<TContext> extends TypeStorage<
  _TypeComposer<TContext> | _InputTypeComposer | GraphQLNamedType
> {
  typeMapper: TypeMapper<TContext>;
  TypeComposer: Class<_TypeComposer<TContext>>;
  InputTypeComposer: typeof _InputTypeComposer;
  EnumTypeComposer: typeof _EnumTypeComposer;
  Resolver: Class<_Resolver<any, TContext>>;

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

    this.typeMapper = new TypeMapper(schema);

    // alive proper Flow type casting in autosuggestions
    /* :: return this; */
  }

  getOrCreateTC(typeName: string): _TypeComposer<TContext> {
    if (!this.hasInstance(typeName, this.TypeComposer)) {
      this.set(typeName, this.TypeComposer.create(typeName));
    }
    return (this.get(typeName): any);
  }

  getOrCreateITC(typeName: string): _InputTypeComposer {
    if (!this.hasInstance(typeName, this.InputTypeComposer)) {
      this.set(typeName, this.InputTypeComposer.create(typeName));
    }
    return (this.get(typeName): any);
  }

  getTC(typeName: string): _TypeComposer<TContext> {
    if (!this.hasInstance(typeName, this.TypeComposer)) {
      throw new Error(`GQC does not have TypeComposer with name ${typeName}`);
    }
    return (this.get(typeName): any);
  }

  getITC(typeName: string): _InputTypeComposer {
    if (!this.hasInstance(typeName, this.InputTypeComposer)) {
      throw new Error(`GQC does not have InputTypeComposer with name ${typeName}`);
    }
    return (this.get(typeName): any);
  }

  rootQuery(): _TypeComposer<TContext> {
    return this.getOrCreateTC('Query');
  }

  rootMutation(): _TypeComposer<TContext> {
    return this.getOrCreateTC('Mutation');
  }

  rootSubscription(): _TypeComposer<TContext> {
    return this.getOrCreateTC('Subscription');
  }

  buildSchema(): GraphQLSchema {
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

    if (Object.keys(roots).length === 0) {
      throw new Error(
        'Can not build schema. Must be initialized at least one ' +
          'of the following types: Query, Mutation, Subscription.'
      );
    }

    return new GraphQLSchema(roots);
  }

  removeEmptyTypes(typeComposer: _TypeComposer<TContext>, passedTypes: Set<string> = new Set()) {
    const fields = typeComposer.getFields();
    Object.keys(fields).forEach(fieldName => {
      const fieldType = fields[fieldName].type;
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
              `GQC: Delete field '${typeComposer.getTypeName()}.${fieldName}' ` +
                `with type '${tc.getTypeName()}', cause it does not have fields.`
            );
            delete fields[fieldName];
          }
        }
      }
    });
    typeComposer.setFields(fields);
  }

  toString(): string {
    // disable redundant noise in console.logs
    return 'SchemaComposer';
  }

  toJSON() {
    // disable redundant noise in console.logs
    return 'SchemaComposer';
  }

  inspect() {
    // disable redundant noise in console.logs
    return 'SchemaComposer';
  }
}
