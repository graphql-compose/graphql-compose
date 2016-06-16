/* @flow */

import MissingType from './type/missingType';
import TypeComposer from './typeComposer';
import { GraphQLObjectType, GraphQLList, GraphQLSchema } from 'graphql';
import type {
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLOutputType,
} from 'graphql/type/definition.js';
import { isType } from 'graphql/type';


export default class ComposeStorage {
  types: { [typeName: string]: GraphQLNamedType };

  constructor() {
    this.types = {};
  }

  hasType(typeName: string): boolean {
    return this.types.hasOwnProperty(typeName);
  }

  getType(typeName: string): GraphQLOutputType {
    if (this.hasType(typeName)) {
      return this.types[typeName];
    }

    return MissingType;
  }

  setType(typeObject: GraphQLNamedType): void {
    if (!isType(typeObject)) {
      throw new Error('You must provide correct GraphQLNamedType');
    }

    if (typeObject instanceof GraphQLList
      || typeObject instanceof GraphQLList) {
      throw new Error('setType does not accept GraphQLList and GraphQLNonNull types. '
      + 'Because this types can not have unique names. So they can be implemented via resolver.');
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

    return new TypeComposer(this.types[typeName], this);
  }

  rootQuery(): TypeComposer {
    return this.typeComposer('RootQuery');
  }

  rootMutation(): TypeComposer {
    return this.typeComposer('RootMutation');
  }

  queries(typeName: string) {
    return this.typeComposer(typeName).getQueryResolverList();
  }

  mutations(typeName: string) {
    return this.typeComposer(typeName).getMutationResolverList();
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
