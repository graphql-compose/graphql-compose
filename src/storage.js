import MissingType from './type/missingType';
import TypeComposer from './typeComposer';
import { GraphQLObjectType, GraphQLList, GraphQLSchema } from 'graphql';
import { isType } from 'graphql/type';


class ComposeStorage {
  constructor() {
    this.types = {};
  }

  hasType(typeName) {
    return this.types.hasOwnProperty(typeName);
  }

  getType(typeName) {
    if (this.hasType(typeName)) {
      return this.types[typeName];
    }

    return MissingType;
  }

  setType(typeObject) {
    if (!isType(typeObject)) {
      throw new Error('You must provide correct GraphQLType');
    }

    if (typeObject instanceof GraphQLList
      || typeObject instanceof GraphQLList) {
      throw new Error('setType does not accept GraphQLList and GraphQLNonNull types. '
      + 'Because this types can not have unique names. So they can be implemented via resolver.');
    }

    this.types[typeObject.name] = typeObject;
  }

  clear() {
    this.types = {};
  }

  typeComposer(typeName) {
    if (!this.hasType(typeName)) {
      this.types[typeName] = new GraphQLObjectType({
        name: typeName,
        fields: {},
      });
    }

    return new TypeComposer(this.types[typeName], this);
  }

  rootQuery() {
    return this.typeComposer('RootQuery');
  }

  rootMutation() {
    return this.typeComposer('RootMutation');
  }

  queries(typeName) {
    return this.typeComposer(typeName).getQueryResolverList();
  }

  mutations(typeName) {
    return this.typeComposer(typeName).getMutationResolverList();
  }

  buildSchema() {
    const fields = {};

    if (this.hasType('RootQuery')) {
      fields.query = this.getType('RootQuery');
    }

    if (this.hasType('RootMutation')) {
      fields.mutation = this.getType('RootMutation');
    }

    if (Object.keys(fields).length === 0) {
      throw new Error('Can not build schema. Must be initialized at least one '
      + 'of the following types: RootQuery, RootMutation.');
    }

    return new GraphQLSchema(fields);
  }
}

export default ComposeStorage;
