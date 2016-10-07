/* @flow */

import {
  GraphQLInputObjectType,
  GraphQLNonNull,
  getNamedType,
  isInputType,
} from 'graphql';
import { resolveMaybeThunk } from './utils/misc';
import { isObject, isString } from './utils/is';
import TypeMapper from './typeMapper';

import type {
  InputObjectConfig,
  InputObjectFieldConfig,
  InputObjectConfigFieldMap,
  InputObjectConfigFieldMapThunk,
  InputObjectField,
  GraphQLInputType,
} from './definition';


export default class InputTypeComposer {
  gqType: GraphQLInputObjectType;

  static create(opts: InputObjectConfig | string) {
    let objConfig;

    if (isString(opts)) {
      objConfig = {
        name: opts,
        fields: () => ({}),
      };
    } else if (isObject(opts)) {
      objConfig = opts;
    } else {
      throw new Error('You should provide InputObjectConfig or string with type name to InputTypeComposer.create(opts)');
    }

    // $FlowFixMe
    const gqType = new GraphQLInputObjectType(objConfig);

    return new InputTypeComposer(gqType);
  }

  constructor(gqType: GraphQLInputObjectType) {
    if (!(gqType instanceof GraphQLInputObjectType)) {
      throw new Error('InputTypeComposer accept only GraphQLInputObjectType in constructor');
    }
    this.gqType = gqType;
  }

  /**
   * Get fields from a GraphQL type
   * WARNING: this method read an internal GraphQL instance variable.
   */
  getFields(): InputObjectConfigFieldMap {
    const fields: InputObjectConfigFieldMapThunk | InputObjectConfigFieldMap
      = this.gqType._typeConfig.fields;

    const fieldMap:mixed = resolveMaybeThunk(fields);

    if (isObject(fieldMap)) {
      return Object.assign({}, fieldMap);
    }
    return {};
  }

  getFieldNames(): string[] {
    return Object.keys(this.getFields());
  }

  hasField(fieldName: string): boolean {
    const fields = this.getFields();
    return !!fields[fieldName];
  }

  /**
   * Completely replace all fields in GraphQL type
   * WARNING: this method rewrite an internal GraphQL instance variable.
   */
  setFields(fields: InputObjectConfigFieldMap): void {
    Object.keys(fields).forEach((name) => {
      const fieldConfig = fields[name];
      if (typeof fieldConfig.type === 'string') {
        const typeName: string = fieldConfig.type;
        const type = TypeMapper.getWrapped(typeName);
        if (isInputType(type)) {
          // $FlowFixMe
          fieldConfig.type = type; // eslint-disable-line
        } else {
          throw new Error(`${this.getTypeName()}.${name} provided incorrect output type '${typeName}'`);
        }
      }
    });

    this.gqType._typeConfig.fields = () => fields;
    delete this.gqType._fields; // if schema was builded, delete defineFieldMap
  }

  /**
   * Add field to a GraphQL type
   */
  addField(fieldName: string, fieldConfig: InputObjectFieldConfig) {
    this.addFields({ [fieldName]: fieldConfig });
  }

  /**
   * Add new fields or replace existed in a GraphQL type
   */
  addFields(newFields: InputObjectConfigFieldMap) {
    this.setFields(Object.assign({}, this.getFields(), newFields));
  }

  /**
   * Get fieldConfig by name
   */
  getField(fieldName: string): ?InputObjectField {
    const fields = this.getFields();

    if (fields[fieldName]) {
      return fields[fieldName];
    }

    return undefined;
  }

  removeField(fieldNameOrArray: string | Array<string>) {
    const fieldNames = Array.isArray(fieldNameOrArray) ? fieldNameOrArray : [fieldNameOrArray];
    const fields = this.getFields();
    fieldNames.forEach(fieldName => delete fields[fieldName]);
    this.setFields(fields);
  }

  clone(newTypeName: string): InputTypeComposer {
    if (!newTypeName) {
      throw new Error('You should provide new type name for clone() method');
    }

    const fields = this.getFields();
    const newFields = {};
    Object.keys(fields).forEach((fieldName) => {
      newFields[fieldName] = Object.assign({}, fields[fieldName]);
    });

    return new InputTypeComposer(
      new GraphQLInputObjectType({
        name: newTypeName,
        fields: newFields,
      })
    );
  }

  /**
   * Get fieldType by name
   */
  getFieldType(fieldName: string): GraphQLInputType | void {
    const field = this.getField(fieldName);
    if (field) {
      return field.type;
    }

    return undefined;
  }

  getType(): GraphQLInputObjectType {
    return this.gqType;
  }

  getTypeName(): string {
    return this.gqType.name;
  }

  setTypeName(name: string): void {
    this.gqType.name = name;
  }

  getDescription(): string {
    return this.gqType.description || '';
  }

  setDescription(description: string): void {
    this.gqType.description = description;
  }

  isFieldRequired(fieldName: string): boolean {
    return this.getFieldType(fieldName) instanceof GraphQLNonNull;
  }

  makeFieldsRequired(fieldNameOrArray: string | Array<string>) {
    const fieldNames = Array.isArray(fieldNameOrArray) ? fieldNameOrArray : [fieldNameOrArray];
    const fields = this.getFields();
    fieldNames.forEach((fieldName) => {
      if (fields[fieldName]) {
        if (!(fields[fieldName].type instanceof GraphQLNonNull)) {
          fields[fieldName].type = new GraphQLNonNull(fields[fieldName].type);
        }
      }
    });
    this.setFields(fields);
  }

  makeFieldsOptional(fieldNameOrArray: string | Array<string>) {
    const fieldNames = Array.isArray(fieldNameOrArray) ? fieldNameOrArray : [fieldNameOrArray];
    const fields = this.getFields();
    fieldNames.forEach((fieldName) => {
      if (fieldNames.includes(fieldName)) {
        if (fields[fieldName].type instanceof GraphQLNonNull) {
          fields[fieldName].type = fields[fieldName].type.ofType;
        }
      }
    });
    this.setFields(fields);
  }

  getByPath(path: string): InputTypeComposer | void {
    let itc = this;
    const parts = path.split('.');
    while (parts.length > 0) {
      if (!itc) return undefined;
      const name = parts[0];
      const fieldType = getNamedType(this.getFieldType(name));
      if (fieldType instanceof GraphQLInputObjectType) {
        itc = new InputTypeComposer(fieldType);
      } else {
        itc = undefined;
      }
      parts.shift();
    }
    return itc;
  }
}
