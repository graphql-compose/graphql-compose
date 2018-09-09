/* @flow strict */
/* eslint-disable no-use-before-define */

import { GraphQLInputObjectType, GraphQLNonNull, GraphQLList, getNamedType } from './graphql';
import { resolveMaybeThunk, upperFirst } from './utils/misc';
import { deprecate } from './utils/debug';
import { isObject, isFunction, isString } from './utils/is';
import { resolveInputConfigMapAsThunk, resolveInputConfigAsThunk } from './utils/configAsThunk';
import { typeByPath } from './utils/typeByPath';
import type { Thunk, ObjMap } from './utils/definitions';
import type { EnumTypeComposer } from './EnumTypeComposer';
import type { TypeAsString } from './TypeMapper';
import type { SchemaComposer } from './SchemaComposer';
import type {
  GraphQLInputFieldConfig,
  GraphQLInputFieldConfigMap,
  GraphQLInputType,
  InputValueDefinitionNode,
} from './graphql';
import { graphqlVersion } from './utils/graphqlVersion';
import { defineInputFieldMap, defineInputFieldMapToConfig } from './utils/configToDefine';

export type GraphQLInputObjectTypeExtended = GraphQLInputObjectType & {
  _gqcFields?: ComposeInputFieldConfigMap,
};

export type ComposeInputFieldConfigMap = ObjMap<ComposeInputFieldConfig>;

export type ComposeInputFieldConfig =
  | ComposeInputFieldConfigAsObject
  | ComposeInputType
  | (() => ComposeInputFieldConfigAsObject | ComposeInputType);

export type ComposeInputFieldConfigAsObject = {
  type: Thunk<ComposeInputType> | GraphQLInputType,
  defaultValue?: mixed,
  description?: ?string,
  astNode?: ?InputValueDefinitionNode,
  [key: string]: any,
};

export type ComposeInputType =
  | InputTypeComposer
  | EnumTypeComposer
  | GraphQLInputType
  | TypeAsString
  | Array<ComposeInputType>;

export type ComposeInputObjectTypeConfig = {
  name: string,
  fields: Thunk<ComposeInputFieldConfigMap>,
  description?: ?string,
};

export class InputTypeComposer {
  gqType: GraphQLInputObjectTypeExtended;

  static schemaComposer: SchemaComposer<any>;

  get schemaComposer(): SchemaComposer<any> {
    return this.constructor.schemaComposer;
  }

  static create(
    opts: TypeAsString | ComposeInputObjectTypeConfig | GraphQLInputObjectType
  ): InputTypeComposer {
    const itc = this.createTemp(opts);
    this.schemaComposer.add(itc);
    return itc;
  }

  static createTemp(
    opts: TypeAsString | ComposeInputObjectTypeConfig | GraphQLInputObjectType
  ): InputTypeComposer {
    if (!this.schemaComposer) {
      throw new Error('Class<InputTypeComposer> must be created by a SchemaComposer.');
    }

    let ITC;

    if (isString(opts)) {
      const typeName: string = opts;
      const NAME_RX = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
      if (NAME_RX.test(typeName)) {
        ITC = new this.schemaComposer.InputTypeComposer(
          new GraphQLInputObjectType({
            name: typeName,
            fields: () => ({}),
          })
        );
      } else {
        const type = this.schemaComposer.typeMapper.createType(typeName);
        if (!(type instanceof GraphQLInputObjectType)) {
          throw new Error(
            'You should provide correct GraphQLInputObjectType type definition.' +
              'Eg. `input MyInputType { name: String! }`'
          );
        }
        ITC = new this.schemaComposer.InputTypeComposer(type);
      }
    } else if (opts instanceof GraphQLInputObjectType) {
      ITC = new this.schemaComposer.InputTypeComposer(opts);
    } else if (isObject(opts)) {
      const fields = opts.fields;
      const type = new GraphQLInputObjectType({
        name: opts.name,
        description: opts.description,
        fields: isFunction(fields)
          ? () => resolveInputConfigMapAsThunk(this.schemaComposer, (fields(): any), opts.name)
          : () => ({}),
      });
      ITC = new this.schemaComposer.InputTypeComposer(type);
      if (isObject(opts.fields)) ITC.addFields(opts.fields);
    } else {
      throw new Error(
        'You should provide InputObjectConfig or string with type name to InputTypeComposer.create(opts)'
      );
    }

    return ITC;
  }

  constructor(gqType: GraphQLInputObjectType) {
    if (!this.schemaComposer) {
      throw new Error('Class<InputTypeComposer> can only be created by a SchemaComposer.');
    }

    if (!(gqType instanceof GraphQLInputObjectType)) {
      throw new Error('InputTypeComposer accept only GraphQLInputObjectType in constructor');
    }
    this.gqType = gqType;
  }

  // -----------------------------------------------
  // Field methods
  // -----------------------------------------------

  getFields(): ComposeInputFieldConfigMap {
    if (!this.gqType._gqcFields) {
      if (graphqlVersion >= 14) {
        this.gqType._gqcFields = (defineInputFieldMapToConfig(this.gqType._fields): any);
      } else {
        // $FlowFixMe
        const fields: Thunk<GraphQLInputFieldConfigMap> = this.gqType._typeConfig.fields;
        this.gqType._gqcFields = (resolveMaybeThunk(fields) || {}: any);
      }
    }

    return this.gqType._gqcFields;
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
  setFields(fields: ComposeInputFieldConfigMap): InputTypeComposer {
    this.gqType._gqcFields = fields;

    if (graphqlVersion >= 14) {
      this.gqType._fields = () => {
        return defineInputFieldMap(
          this.gqType,
          resolveInputConfigMapAsThunk(this.schemaComposer, fields, this.getTypeName())
        );
      };
    } else {
      // $FlowFixMe
      this.gqType._typeConfig.fields = () => {
        return resolveInputConfigMapAsThunk(this.schemaComposer, fields, this.getTypeName());
      };
      delete this.gqType._fields; // if schema was builded, delete defineFieldMap
    }
    return this;
  }

  setField(fieldName: string, fieldConfig: ComposeInputFieldConfig): InputTypeComposer {
    this.addFields({ [fieldName]: fieldConfig });
    return this;
  }

  /**
   * Add new fields or replace existed in a GraphQL type
   */
  addFields(newFields: ComposeInputFieldConfigMap): InputTypeComposer {
    this.setFields({ ...this.getFields(), ...newFields });
    return this;
  }

  /**
   * Add new fields or replace existed (where field name may have dots)
   */
  addNestedFields(newFields: ComposeInputFieldConfigMap): InputTypeComposer {
    Object.keys(newFields).forEach(fieldName => {
      const fc = newFields[fieldName];
      const names = fieldName.split('.');
      const name = names.shift();

      if (names.length === 0) {
        // single field
        this.setField(name, fc);
      } else {
        // nested field
        let childTC;
        if (!this.hasField(name)) {
          childTC = this.schemaComposer.InputTypeComposer.createTemp(
            `${this.getTypeName()}${upperFirst(name)}`
          );
          this.setField(name, childTC);
        } else {
          childTC = this.getFieldTC(name);
        }
        childTC.addNestedFields({ [names.join('.')]: fc });
      }
    });

    return this;
  }

  /**
   * Get fieldConfig by name
   */
  getField(fieldName: string): ComposeInputFieldConfig {
    const fields = this.getFields();

    if (!fields[fieldName]) {
      throw new Error(
        `Cannot get field '${fieldName}' from input type '${this.getTypeName()}'. Field does not exist.`
      );
    }

    return fields[fieldName];
  }

  removeField(fieldNameOrArray: string | Array<string>): InputTypeComposer {
    const fieldNames = Array.isArray(fieldNameOrArray) ? fieldNameOrArray : [fieldNameOrArray];
    const fields = this.getFields();
    fieldNames.forEach(fieldName => delete fields[fieldName]);
    this.setFields(fields);
    return this;
  }

  removeOtherFields(fieldNameOrArray: string | Array<string>): InputTypeComposer {
    const keepFieldNames = Array.isArray(fieldNameOrArray) ? fieldNameOrArray : [fieldNameOrArray];
    const fields = this.getFields();
    Object.keys(fields).forEach(fieldName => {
      if (keepFieldNames.indexOf(fieldName) === -1) {
        delete fields[fieldName];
      }
    });
    this.setFields(fields);
    return this;
  }

  extendField(
    fieldName: string,
    parialFieldConfig: $Shape<ComposeInputFieldConfigAsObject>
  ): InputTypeComposer {
    let prevFieldConfig;
    try {
      prevFieldConfig = this.getFieldConfig(fieldName);
    } catch (e) {
      throw new Error(
        `Cannot extend field '${fieldName}' from input type '${this.getTypeName()}'. Field does not exist.`
      );
    }

    this.setField(fieldName, {
      ...prevFieldConfig,
      ...parialFieldConfig,
    });
    return this;
  }

  reorderFields(names: string[]): InputTypeComposer {
    const orderedFields = {};
    const fields = this.getFields();
    names.forEach(name => {
      if (fields[name]) {
        orderedFields[name] = fields[name];
        delete fields[name];
      }
    });
    this.setFields({ ...orderedFields, ...fields });
    return this;
  }

  isFieldNonNull(fieldName: string): boolean {
    return this.getFieldType(fieldName) instanceof GraphQLNonNull;
  }

  // alias for isFieldNonNull
  isRequired(fieldName: string): boolean {
    return this.isFieldNonNull(fieldName);
  }

  getFieldConfig(fieldName: string): GraphQLInputFieldConfig {
    const fc = this.getField(fieldName);
    if (!fc) {
      throw new Error(`Type ${this.getTypeName()} does not have field with name '${fieldName}'`);
    }

    return resolveInputConfigAsThunk(this.schemaComposer, fc, fieldName, this.getTypeName());
  }

  getFieldType(fieldName: string): GraphQLInputType {
    return this.getFieldConfig(fieldName).type;
  }

  getFieldTC(fieldName: string): InputTypeComposer {
    const fieldType = getNamedType(this.getFieldType(fieldName));
    if (!(fieldType instanceof GraphQLInputObjectType)) {
      throw new Error(
        `Cannot get InputTypeComposer for field '${fieldName}' in type ${this.getTypeName()}. ` +
          `This field should be InputObjectType, but it has type '${fieldType.constructor.name}'`
      );
    }
    return this.schemaComposer.InputTypeComposer.createTemp(fieldType);
  }

  makeFieldNonNull(fieldNameOrArray: string | Array<string>): InputTypeComposer {
    const fieldNames = Array.isArray(fieldNameOrArray) ? fieldNameOrArray : [fieldNameOrArray];
    fieldNames.forEach(fieldName => {
      if (this.hasField(fieldName)) {
        const fieldType = this.getFieldType(fieldName);
        if (!(fieldType instanceof GraphQLNonNull)) {
          this.extendField(fieldName, { type: new GraphQLNonNull(fieldType) });
        }
      }
    });
    return this;
  }

  // alias for makeFieldNonNull
  makeRequired(fieldNameOrArray: string | Array<string>): InputTypeComposer {
    return this.makeFieldNonNull(fieldNameOrArray);
  }

  makeFieldNullable(fieldNameOrArray: string | Array<string>): InputTypeComposer {
    const fieldNames = Array.isArray(fieldNameOrArray) ? fieldNameOrArray : [fieldNameOrArray];
    fieldNames.forEach(fieldName => {
      if (this.hasField(fieldName)) {
        const fieldType = this.getFieldType(fieldName);
        if (fieldType instanceof GraphQLNonNull) {
          this.extendField(fieldName, { type: fieldType.ofType });
        }
      }
    });
    return this;
  }

  makeOptional(fieldNameOrArray: string | Array<string>): InputTypeComposer {
    return this.makeFieldNullable(fieldNameOrArray);
  }

  // -----------------------------------------------
  // Type methods
  // -----------------------------------------------

  getType(): GraphQLInputObjectType {
    return this.gqType;
  }

  getTypePlural(): GraphQLList<GraphQLInputObjectType> {
    return new GraphQLList(this.gqType);
  }

  getTypeNonNull(): GraphQLNonNull<GraphQLInputObjectType> {
    return new GraphQLNonNull(this.gqType);
  }

  /** @deprecated 5.0.0 */
  getTypeAsRequired(): GraphQLNonNull<GraphQLInputObjectType> {
    deprecate('Use `InputTypeComposer.getTypeNonNull` method instead of `getTypeAsRequired`');
    return this.getTypeNonNull();
  }

  getTypeName(): string {
    return this.gqType.name;
  }

  setTypeName(name: string): InputTypeComposer {
    this.gqType.name = name;
    this.schemaComposer.add(this);
    return this;
  }

  getDescription(): string {
    return this.gqType.description || '';
  }

  setDescription(description: string): InputTypeComposer {
    this.gqType.description = description;
    return this;
  }

  clone(newTypeName: string): InputTypeComposer {
    if (!newTypeName) {
      throw new Error('You should provide new type name for clone() method');
    }

    const newFields = {};
    this.getFieldNames().forEach(fieldName => {
      const fc = this.getFieldConfig(fieldName);
      newFields[fieldName] = { ...(fc: any) };
    });

    return new this.schemaComposer.InputTypeComposer(
      new GraphQLInputObjectType({
        name: newTypeName,
        fields: newFields,
      })
    );
  }

  // -----------------------------------------------
  // Misc methods
  // -----------------------------------------------

  get(path: string | Array<string>): any {
    return typeByPath(this, path);
  }
}
