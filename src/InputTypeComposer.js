/* @flow strict */
/* eslint-disable no-use-before-define */

import { GraphQLInputObjectType, GraphQLNonNull, getNamedType } from './graphql';
import { resolveMaybeThunk } from './utils/misc';
// import { deprecate } from './utils/debug';
import { isObject, isString } from './utils/is';
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
} & { $call?: void };

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

  static create(
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
      const type = new GraphQLInputObjectType({
        name: opts.name,
        description: opts.description,
        fields: () => ({}),
      });
      ITC = new this.schemaComposer.InputTypeComposer(type);

      if (isObject(opts.fields)) {
        ITC.addFields(opts.fields);
      }
    } else {
      throw new Error(
        'You should provide InputObjectConfig or string with type name to InputTypeComposer.create(opts)'
      );
    }

    return ITC;
  }

  constructor(gqType: GraphQLInputObjectType) {
    if (!this.constructor.schemaComposer) {
      throw new Error('Class<InputTypeComposer> can only be created by a SchemaComposer.');
    }

    if (!(gqType instanceof GraphQLInputObjectType)) {
      throw new Error('InputTypeComposer accept only GraphQLInputObjectType in constructor');
    }
    this.gqType = gqType;
  }

  /**
   * Get fields from a GraphQL type
   * WARNING: this method read an internal GraphQL instance variable.
   */
  getFields(): ComposeInputFieldConfigMap {
    if (!this.gqType._gqcFields) {
      const fields: Thunk<GraphQLInputFieldConfigMap> = this.gqType._typeConfig.fields;
      this.gqType._gqcFields = (resolveMaybeThunk(fields) || {}: any);
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

    this.gqType._typeConfig.fields = () => {
      return resolveInputConfigMapAsThunk(
        this.constructor.schemaComposer,
        fields,
        this.getTypeName()
      );
    };
    delete this.gqType._fields; // if schema was builded, delete defineFieldMap
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

  isRequired(fieldName: string): boolean {
    return this.getFieldType(fieldName) instanceof GraphQLNonNull;
  }

  getFieldConfig(fieldName: string): GraphQLInputFieldConfig {
    const fc = this.getField(fieldName);
    if (!fc) {
      throw new Error(`Type ${this.getTypeName()} does not have field with name '${fieldName}'`);
    }

    return resolveInputConfigAsThunk(
      this.constructor.schemaComposer,
      fc,
      fieldName,
      this.getTypeName()
    );
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
    return this.constructor.schemaComposer.InputTypeComposer.create(fieldType);
  }

  makeRequired(fieldNameOrArray: string | Array<string>): InputTypeComposer {
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

  makeOptional(fieldNameOrArray: string | Array<string>): InputTypeComposer {
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

  clone(newTypeName: string): InputTypeComposer {
    if (!newTypeName) {
      throw new Error('You should provide new type name for clone() method');
    }

    const newFields = {};
    this.getFieldNames().forEach(fieldName => {
      const fc = this.getFieldConfig(fieldName);
      newFields[fieldName] = { ...(fc: any) };
    });

    return new this.constructor.schemaComposer.InputTypeComposer(
      new GraphQLInputObjectType({
        name: newTypeName,
        fields: newFields,
      })
    );
  }

  getType(): GraphQLInputObjectType {
    return this.gqType;
  }

  getTypeAsRequired(): GraphQLNonNull<GraphQLInputObjectType> {
    return new GraphQLNonNull(this.gqType);
  }

  getTypeName(): string {
    return this.gqType.name;
  }

  setTypeName(name: string): InputTypeComposer {
    this.gqType.name = name;
    return this;
  }

  getDescription(): string {
    return this.gqType.description || '';
  }

  setDescription(description: string): InputTypeComposer {
    this.gqType.description = description;
    return this;
  }

  get(path: string | Array<string>): any {
    return typeByPath(this, path);
  }
}
