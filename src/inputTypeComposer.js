/* @flow */

import {
  GraphQLInputObjectType,
  GraphQLNonNull,
} from 'graphql';
import { resolveMaybeThunk } from './utils/misc';
import { deprecate } from './utils/debug';
import { isObject, isString } from './utils/is';
import TypeMapper from './typeMapper';
import { typeByPath } from './typeByPath';

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

  static create(opts: InputObjectConfig | string | GraphQLInputObjectType) {
    let ITC;

    if (isString(opts)) {
      // $FlowFixMe
      const typeName: string = opts;
      const NAME_RX = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
      if (NAME_RX.test(typeName)) {
        ITC = new InputTypeComposer(new GraphQLInputObjectType({
          name: typeName,
          fields: () => ({}),
        }));
      } else {
        const type = TypeMapper.createType(typeName);
        if (!(type instanceof GraphQLInputObjectType)) {
          throw new Error('You should provide correct GraphQLInputObjectType type definition.');
        }
        ITC = new InputTypeComposer(type);
      }
    } else if (opts instanceof GraphQLInputObjectType) {
      ITC = new InputTypeComposer(opts);
    } else if (isObject(opts)) {
      // $FlowFixMe
      const type = new GraphQLInputObjectType({
        ...opts,
        fields: () => ({}),
      });
      ITC = new InputTypeComposer(type);

      // $FlowFixMe
      if (isObject(opts.fields)) {
        ITC.addFields(opts.fields);
      }
    } else {
      throw new Error('You should provide InputObjectConfig or string with type name to InputTypeComposer.create(opts)');
    }

    return ITC;
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
    const prepearedFields = TypeMapper.convertInputFieldConfigMap(
      fields,
      this.getTypeName()
    );

    this.gqType._typeConfig.fields = () => prepearedFields;
    delete this.gqType._fields; // if schema was builded, delete defineFieldMap
  }

  setField(fieldName: string, fieldConfig: InputObjectFieldConfig) {
    this.addFields({ [fieldName]: fieldConfig });
  }

  /**
  * @deprecated 2.0.0
  */
  addField(fieldName: string, fieldConfig: InputObjectFieldConfig) {
    deprecate('Use InputTypeComposer.setField() or plural addFields({}) instead.');
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

  isRequired(fieldName: string): boolean {
    return this.getFieldType(fieldName) instanceof GraphQLNonNull;
  }

  /**
  * @deprecated 2.0.0
  */
  isFieldRequired(fieldName: string): boolean {
    deprecate('Use InputTypeComposer.isRequired() instead.');
    return this.isRequired(fieldName);
  }

  makeRequired(fieldNameOrArray: string | Array<string>) {
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

  /**
  * @deprecated 2.0.0
  */
  makeFieldsRequired(fieldNameOrArray: string | Array<string>) {
    deprecate('Use InputTypeComposer.makeRequired() instead.');
    this.makeRequired(fieldNameOrArray);
  }

  makeOptional(fieldNameOrArray: string | Array<string>) {
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

  /**
  * @deprecated 2.0.0
  */
  makeFieldsOptional(fieldNameOrArray: string | Array<string>) {
    deprecate('Use InputTypeComposer.makeOptional() instead.');
    this.makeOptional(fieldNameOrArray);
  }

  /**
  * @deprecated 2.0.0
  */
  getByPath(path: string | Array<string>): mixed {
    deprecate('Use InputTypeComposer.get() instead.');
    return this.get(path);
  }

  get(path: string | Array<string>): mixed {
    return typeByPath(this, path);
  }
}
