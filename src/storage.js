/* @flow */

import TypeComposer from './typeComposer';
import { GraphQLObjectType, GraphQLSchema } from 'graphql';

import type ResolverList from './resolver/resolverList';
import type Resolver from './resolver/resolver';


export default class ComposeStorage {
  types: { [typeName: string]: GraphQLObjectType };

  constructor() {
    this.types = {};
  }

  hasType(typeName: string): boolean {
    return !!this.types[typeName];
  }

  getType(typeName: string): ?GraphQLObjectType {
    if (this.hasType(typeName)) {
      return this.types[typeName];
    }

    return undefined;
  }

  setType(typeObject: GraphQLObjectType): void {
    if (!(typeObject instanceof GraphQLObjectType)) {
      throw new Error('You must provide correct GraphQLObjectType');
    }

    this.types[typeObject.name] = typeObject;
  }

  clear(): void {
    this.types = {};
  }

  typeComposer(typeName: string): TypeComposer {
    if (!this.hasType(typeName)) {
      this.types[typeName] = new GraphQLObjectType({
        name: typeName,
        fields: {},
      });
    }

    return new TypeComposer(this.types[typeName]);
  }

  rootQuery(): TypeComposer {
    return this.typeComposer('RootQuery');
  }

  rootMutation(): TypeComposer {
    return this.typeComposer('RootMutation');
  }

  resolvers(typeName: string): ResolverList {
    return this.typeComposer(typeName).getResolvers();
  }

  resolver(typeName: string, resolverName: string): Resolver | void {
    return this.typeComposer(typeName).getResolver(resolverName);
  }

  buildSchema() {
    const fields = {};

    if (this.hasType('RootQuery')) {
      const rootQuery = this.getType('RootQuery');
      if (rootQuery instanceof GraphQLObjectType) {
        fields.query = rootQuery;
      } else {
        throw new Error('RootQuery must be GraphQLObjectType');
      }
    }

    if (this.hasType('RootMutation')) {
      const rootMutation = this.getType('RootMutation');
      if (rootMutation instanceof GraphQLObjectType) {
        fields.mutation = rootMutation;
      } else {
        throw new Error('RootMutation must be GraphQLObjectType');
      }
    }

    if (Object.keys(fields).length === 0) {
      throw new Error('Can not build schema. Must be initialized at least one '
      + 'of the following types: RootQuery, RootMutation.');
    }

    return new GraphQLSchema(fields);
  }
}
