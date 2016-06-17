/* @flow */

import { resolveMaybeThunk, isObject } from './utils/misc';
import ResolverList from './resolver/resolverList';
import Resolver from './resolver/resolver';
import type {
  GraphQLObjectType,
  GraphQLFieldConfig,
  GraphQLFieldConfigMap,
  GraphQLFieldConfigMapThunk,
} from './definition.js';
import type ComposerStorage from './storage';

export default class TypeComposer {
  storage: ?ComposerStorage;
  gqType: GraphQLObjectType & {
    _gqcQueryResolverList?: ResolverList,
    _gqcMutationResolverList?: ResolverList,
  };

  constructor(gqType: GraphQLObjectType, storage: ComposerStorage) {
    this.gqType = gqType;
    this.storage = storage;
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
  getField(fieldName: string) {
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

  /**
   * Get fieldType by name
   */
  getFieldType(fieldName: string) {
    const field = this.getField(fieldName);
    if (field) {
      return field.type;
    }

    return undefined;
  }

  getType(): GraphQLObjectType {
    return this.gqType;
  }

  getTypeName(): string {
    const type = this.getType();
    if (type) {
      return type.name;
    }

    return 'MissingType';
  }

  getQueryResolverList(): ResolverList {
    let resolverList;

    const injectedParamName = '_gqcQueryResolverList';
    if (!this.gqType[injectedParamName]) {
      resolverList = this.gqType[injectedParamName] = new ResolverList('query', this);
    } else {
      resolverList = this.gqType[injectedParamName];
    }

    return resolverList;
  }

  getMutationResolverList(): ResolverList {
    let resolverList;

    const injectedParamName = '_gqcMutationResolverList';
    if (!this.gqType[injectedParamName]) {
      resolverList = this.gqType[injectedParamName] = new ResolverList('mutation', this);
    } else {
      resolverList = this.gqType[injectedParamName];
    }

    return resolverList;
  }
}
