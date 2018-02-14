/* @flow strict */
/* eslint-disable class-methods-use-this */

import { GraphQLObjectType, GraphQLSchema } from './graphql';
import { TypeStorage } from './TypeStorage';
import { TypeMapper } from './TypeMapper';
import { TypeComposer as _TypeComposer } from './TypeComposer';
import { InputTypeComposer as _InputTypeComposer } from './InputTypeComposer';
import { EnumTypeComposer as _EnumTypeComposer } from './EnumTypeComposer';
import { Resolver as _Resolver } from './Resolver';
import { isFunction } from './utils/is';

export class SchemaComposer<TContext> extends TypeStorage<TContext> {
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
