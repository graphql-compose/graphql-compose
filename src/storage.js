/* @flow */

import TypeComposer from './typeComposer';
import { GraphQLObjectType, GraphQLSchema } from 'graphql';

import type ResolverList from './resolver/resolverList';
import type Resolver from './resolver/resolver';
import type InputTypeComposer from './inputTypeComposer';

export default class ComposeStorage {
  types: { [typeName: string]: TypeComposer };

  constructor() {
    this.types = {};
  }

  has(typeName: string): boolean {
    return !!this.types[typeName];
  }

  add(typeComposer: TypeComposer): void {
    if (!(typeComposer instanceof TypeComposer)) {
      throw new Error('You must provide instance of TypeComposer');
    }

    this.types[typeComposer.getTypeName()] = typeComposer;
  }

  clear(): void {
    this.types = {};
  }

  get(typeName: string): TypeComposer {
    if (!this.has(typeName)) {
      const gqType = new GraphQLObjectType({
        name: typeName,
        fields: () => ({}),
      });
      this.types[typeName] = new TypeComposer(gqType);
    }
    return this.types[typeName];
  }

  rootQuery(): TypeComposer {
    return this.get('RootQuery');
  }

  rootMutation(): TypeComposer {
    return this.get('RootMutation');
  }

  resolvers(typeName: string): ResolverList {
    return this.get(typeName).getResolvers();
  }

  resolver(typeName: string, resolverName: string): Resolver | void {
    return this.get(typeName).getResolver(resolverName);
  }

  buildSchema() {
    const roots = {};

    if (this.has('RootQuery')) {
      const tc = this.get('RootQuery');
      roots.query = this.removeEmptyTypes(tc).getType();
    }

    if (this.has('RootMutation')) {
      const tc = this.get('RootMutation');
      roots.mutation = this.removeEmptyTypes(tc).getType();
    }

    if (Object.keys(roots).length === 0) {
      throw new Error('Can not build schema. Must be initialized at least one '
      + 'of the following types: RootQuery, RootMutation.');
    }

    return new GraphQLSchema(roots);
  }

  removeEmptyTypes<T: TypeComposer | InputTypeComposer>(typeComposer: T): T {
    const fields = typeComposer.getFields();
    Object.keys(fields).forEach(fieldName => {
      if (fields[fieldName].type instanceof GraphQLObjectType) {
        const tc = new TypeComposer(fields[fieldName].type);
        if (Object.keys(tc.getFields()).length > 0) {
          this.removeEmptyTypes(tc);
        } else {
          console.log(`GQC: Delete field '${typeComposer.getTypeName()}.${fieldName}' `
                    + `with type '${tc.getTypeName()}', cause it does not have fields.`)
          delete fields[fieldName];
        }
      }
    });
    typeComposer.setFields(fields);
    return typeComposer;
  }
}
