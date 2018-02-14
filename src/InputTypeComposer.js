/* @flow strict */
/* eslint-disable no-use-before-define */

import { GraphQLInputObjectType, GraphQLNonNull, getNamedType } from './graphql';
import { resolveMaybeThunk } from './utils/misc';
// import { deprecate } from './utils/debug';
import { isObject, isString } from './utils/is';
import { resolveInputConfigsAsThunk, keepConfigsAsThunk } from './utils/configAsThunk';
import { typeByPath } from './utils/typeByPath';
import type { Thunk, ObjMap } from './utils/definitions';
import type { EnumTypeComposer } from './EnumTypeComposer';
import type { TypeAsString } from './TypeMapper';
import type { SchemaComposer } from './SchemaComposer';
import type {
  // GraphQLInputFieldConfig,
  GraphQLInputFieldConfigMap,
  GraphQLInputType,
  InputValueDefinitionNode,
} from './graphql';

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
  gqType: GraphQLInputObjectType;

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
   * TODO: should return GraphQLInputFieldConfigMap
   * BUT if setFields(fields: ComposeInputFieldConfigMap | GraphQLInputFieldConfigMap)
   * then flow producess error with such common case ITC.setFields(ITC.getFields())
   * with following message "Could not decide which case to select"
   * More info about solution
   *  https://twitter.com/nodkz/status/925010361815851008
   *  https://github.com/facebook/flow/issues/2892
   */
  getFields(): ObjMap<any> {
    const fields: Thunk<GraphQLInputFieldConfigMap> = this.gqType._typeConfig.fields;

    const fieldMap: mixed = keepConfigsAsThunk(resolveMaybeThunk(fields));

    if (isObject(fieldMap)) {
      return { ...fieldMap };
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
  setFields(fields: ComposeInputFieldConfigMap): InputTypeComposer {
    const prepearedFields = this.constructor.schemaComposer.typeMapper.convertInputFieldConfigMap(
      fields,
      this.getTypeName()
    );

    this.gqType._typeConfig.fields = () =>
      resolveInputConfigsAsThunk(
        this.constructor.schemaComposer,
        prepearedFields,
        this.getTypeName()
      );
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
   * TODO should be GraphQLInputFieldConfig
   * see getFields() method for details
   */
  getField(fieldName: string): any {
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
      prevFieldConfig = this.getField(fieldName);
    } catch (e) {
      throw new Error(
        `Cannot extend field '${fieldName}' from input type '${this.getTypeName()}'. Field does not exist.`
      );
    }

    const fieldConfig: ComposeInputFieldConfig = {
      ...(prevFieldConfig: any),
      ...(parialFieldConfig: any),
    };
    this.setField(fieldName, fieldConfig);
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

  getFieldType(fieldName: string): GraphQLInputType {
    const field = this.getField(fieldName);
    if (!field) {
      throw new Error(`Type ${this.getTypeName()} does not have field with name '${fieldName}'`);
    }

    return field.type;
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
    const fields = this.getFields();
    fieldNames.forEach(fieldName => {
      if (fields[fieldName] && fields[fieldName].type) {
        if (!(fields[fieldName].type instanceof GraphQLNonNull)) {
          fields[fieldName].type = new GraphQLNonNull(fields[fieldName].type);
        }
      }
    });
    this.setFields(fields);
    return this;
  }

  makeOptional(fieldNameOrArray: string | Array<string>): InputTypeComposer {
    const fieldNames = Array.isArray(fieldNameOrArray) ? fieldNameOrArray : [fieldNameOrArray];
    const fields = this.getFields();
    fieldNames.forEach(fieldName => {
      if (fieldNames.indexOf(fieldName) > -1) {
        if (fields[fieldName] && fields[fieldName].type instanceof GraphQLNonNull) {
          fields[fieldName].type = fields[fieldName].type.ofType;
        }
      }
    });
    this.setFields(fields);
    return this;
  }

  clone(newTypeName: string): InputTypeComposer {
    if (!newTypeName) {
      throw new Error('You should provide new type name for clone() method');
    }

    const fields = this.getFields();
    const newFields = {};
    Object.keys(fields).forEach(fieldName => {
      newFields[fieldName] = { ...fields[fieldName] };
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
