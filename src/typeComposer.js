/* @flow */

import { resolveMaybeThunk, isObject } from './utils/misc';
import ResolverList from './resolver/resolverList';
import Resolver from './resolver/resolver';
import { toInputObjectType } from './toInputObjectType';
import TypeInputComposer from './typeInputComposer';

import { GraphQLObjectType } from 'graphql/type';

import type {
  GraphQLInputObjectType,
  GraphQLFieldConfig,
  GraphQLFieldConfigMap,
  GraphQLFieldConfigMapThunk,
  GraphQLOutputType,
} from './definition.js';


export default class TypeComposer {
  gqType: GraphQLObjectType & {
    _gqcQueryResolverList?: ResolverList,
    _gqcMutationResolverList?: ResolverList,
    _gqcInputType?: GraphQLInputObjectType,
    _gqcResolvers?: ResolverList,
  };

  constructor(gqType: GraphQLObjectType) {
    this.gqType = gqType;
  }

  /**
   * Get fields from a GraphQL type
   * WARNING: this method read an internal GraphQL instance variable.
   */
  getFields(): GraphQLFieldConfigMap {
    const fields: GraphQLFieldConfigMapThunk | GraphQLFieldConfigMap
      = this.gqType._typeConfig.fields;

    const fieldMap:mixed = resolveMaybeThunk(fields);

    if (isObject(fieldMap)) {
      return Object.assign({}, fieldMap);
    }
    return {};
  }

  /**
   * Completely replace all fields in GraphQL type
   * WARNING: this method rewrite an internal GraphQL instance variable.
   */
  setFields(fields: GraphQLFieldConfigMap): void {
    this.gqType._typeConfig.fields = () => fields;
    delete this.gqType._fields; // if schema was builded, delete defineFieldMap
  }

  hasField(fieldName: string): boolean {
    const fields = this.getFields();
    return !!fields[fieldName];
  }

  addRelation(
    fieldName: string,
    resolver: Resolver,
    description: string,
    deprecationReason: ?string
  ) {
    if (!resolver instanceof Resolver) {
      throw new Error('You should provide correct Resolver object.');
    }

    this.addField(fieldName, {
      description,
      deprecationReason,
      ...resolver.getFieldConfig(),
      _gqcResolver: resolver,
    });
    return this;
  }

  /**
   * Add field to a GraphQL type
   */
  addField(fieldName: string, fieldConfig: GraphQLFieldConfig) {
    this.addFields({ [fieldName]: fieldConfig });
  }

  /**
   * Add new fields or replace existed in a GraphQL type
   */
  addFields(newFields: GraphQLFieldConfigMap) {
    this.setFields(Object.assign({}, this.getFields(), newFields));
  }

  /**
   * Get fieldConfig by name
   */
  getField(fieldName: string): GraphQLFieldConfig {
    const fields = this.getFields();

    if (fields[fieldName]) {
      return fields[fieldName];
    }

    return undefined;
  }

  removeField(fieldNameOrArray: string | Array<string>) {
    const fieldNames = Array.isArray(fieldNameOrArray) ? fieldNameOrArray : [fieldNameOrArray];
    const fields = this.getFields();
    fieldNames.forEach((fieldName) => delete fields[fieldName]);
    this.setFields(Object.assign({}, fields)); // immutability
  }


  clone(newTypeName: string): TypeComposer {
    return new TypeComposer(
      new GraphQLObjectType({
        name: newTypeName,
        fields: this.getFields(),
      })
    );
  }

  /**
   * Get fieldType by name
   */
  getFieldType(fieldName: string): GraphQLOutputType | void {
    const field = this.getField(fieldName);
    if (field) {
      return field.type;
    }

    return undefined;
  }

  getType(): GraphQLObjectType {
    return this.gqType;
  }

  getInputType(): GraphQLInputObjectType {
    if (!this.gqType._gqcInputType) {
      this.gqType._gqcInputType = toInputObjectType(this.gqType);
    }

    return this.gqType._gqcInputType;
  }

  getInputTypeComposer(): TypeInputComposer {
    return new TypeInputComposer(this.getInputType());
  }

  getTypeName(): string {
    const type = this.getType();
    if (type) {
      return type.name;
    }

    return 'MissingType';
  }

  hasResolver(name: string): boolean {
    if (!this.gqType._gqcResolvers) {
      return false;
    }
    return this.gqType._gqcResolvers.has(name);
  }

  getResolver(name: string): Resolver | null {
    if (this.hasResolver(name) && this.gqType._gqcResolvers) {
      return this.gqType._gqcResolvers.get(name);
    }

    return null;
  }

  setResolver(resolver: Resolver) {
    if (!this.gqType._gqcResolvers) {
      this.gqType._gqcResolvers = new ResolverList();
    }
    if (!(resolver instanceof Resolver)) {
      throw new Error('setResolver() accept only Resolver instance');
    }
    if (!resolver.name) {
      throw new Error('resolver should have non-empty name property');
    }
    this.gqType._gqcResolvers.set(resolver.name, resolver);
  }
}
