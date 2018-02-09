/* @flow */
/* eslint-disable class-methods-use-this */

import { GraphQLObjectType, GraphQLSchema, type GraphQLNamedType } from './graphql';
import { TypeStorage } from './typeStorage';
import { TypeMapper as _TypeMapper } from './typeMapper';
import { TypeComposer as _TypeComposer } from './typeComposer';
import { InputTypeComposer as _InputTypeComposer } from './inputTypeComposer';
import { EnumTypeComposer as _EnumTypeComposer } from './enumTypeComposer';
import { Resolver as _Resolver } from './resolver';

export class SchemaComposer extends TypeStorage<
  _TypeComposer | _InputTypeComposer | GraphQLNamedType
> {
  TypeMapper: _TypeMapper;
  TypeComposer: typeof _TypeComposer;
  InputTypeComposer: typeof _InputTypeComposer;
  EnumTypeComposer: typeof _EnumTypeComposer;
  Resolver: typeof _Resolver;

  constructor() {
    super();
    const schema = this;

    class TypeComposer extends _TypeComposer {
      static _schema = schema;
    }
    this.TypeComposer = TypeComposer;

    class InputTypeComposer extends _InputTypeComposer {
      static _schema = schema;
    }
    this.InputTypeComposer = InputTypeComposer;

    class Resolver extends _Resolver<any, any> {
      static _schema = schema;
    }
    this.Resolver = Resolver;

    class EnumTypeComposer extends _EnumTypeComposer {
      static _schema = schema;
    }
    this.EnumTypeComposer = EnumTypeComposer;

    class TypeMapper extends _TypeMapper {
      _schema = schema;
    }
    this.TypeMapper = new TypeMapper();
  }

  getOrCreateTC(typeName: string): _TypeComposer {
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

  getTC(typeName: string): _TypeComposer {
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

  rootQuery(): _TypeComposer {
    return this.getOrCreateTC('Query');
  }

  rootMutation(): _TypeComposer {
    return this.getOrCreateTC('Mutation');
  }

  rootSubscription(): _TypeComposer {
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

  removeEmptyTypes(typeComposer: _TypeComposer, passedTypes: Set<string> = new Set()) {
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
