/* @flow */
/* eslint-disable no-use-before-define */

import invariant from 'graphql/jsutils/invariant';
import { GraphQLEnumType, GraphQLList, GraphQLNonNull } from './graphql';
import { isObject, isString } from './utils/is';
import type {
  GraphQLEnumValueConfig,
  GraphQLEnumTypeConfig,
  GraphQLEnumValueConfigMap,
  GraphQLEnumValue,
} from './graphql';
import type { TypeAsString } from './typeMapper';
import { graphqlVersion } from './utils/graphqlVersion';
import type { SchemaComposer } from './schemaComposer';

export type GraphQLEnumTypeExtended = GraphQLEnumType & {
  _gqcEnumTypeComposer?: EnumTypeComposer,
};

export class EnumTypeComposer {
  gqType: GraphQLEnumType;

  static _schema: SchemaComposer<any>;

  static create(opts: TypeAsString | GraphQLEnumTypeConfig | GraphQLEnumType): EnumTypeComposer {
    let ETC;

    if (isString(opts)) {
      const typeName: string = opts;
      const NAME_RX = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
      if (NAME_RX.test(typeName)) {
        ETC = new this._schema.EnumTypeComposer(
          new GraphQLEnumType({
            name: typeName,
            values: {},
          })
        );
      } else {
        const type = this._schema.TypeMapper.createType(typeName);
        if (!(type instanceof GraphQLEnumType)) {
          throw new Error(
            'You should provide correct GraphQLEnumType type definition.' +
              'Eg. `enum MyType { KEY1 KEY2 KEY3 }`'
          );
        }
        ETC = new this._schema.EnumTypeComposer(type);
      }
    } else if (opts instanceof GraphQLEnumType) {
      ETC = new this._schema.EnumTypeComposer(opts);
    } else if (isObject(opts)) {
      const type = new GraphQLEnumType({
        ...(opts: any),
      });
      ETC = new this._schema.EnumTypeComposer(type);
    } else {
      throw new Error('You should provide GraphQLEnumTypeConfig or string with enum name or SDL');
    }

    return ETC;
  }

  constructor(gqType: GraphQLEnumType): EnumTypeComposer {
    this.gqType = gqType;

    // alive proper Flow type casting in autosuggestions
    /* :: return this; */
  }

  hasField(name: string): boolean {
    const values = this.getFields();
    return !!values[name];
  }

  _fixEnumBelowV13() {
    if (graphqlVersion < 13) {
      if (!this.gqType._values) {
        // Support for graphql@0.11 and below
        this.gqType._values = defineEnumValues(this.gqType, this.gqType._enumConfig.values);
      }
    }
  }

  getFields(): GraphQLEnumValueConfigMap {
    this._fixEnumBelowV13();
    return (this.gqType._getNameLookup(): any);
  }

  getField(name: string): GraphQLEnumValueConfig {
    const values = this.getFields();

    if (!values[name]) {
      throw new Error(
        `Cannot get value '${name}' from enum type '${this.getTypeName()}'. Value with such name does not exist.`
      );
    }

    return values[name];
  }

  getFieldNames(): string[] {
    return Object.keys(this.getFields());
  }

  /**
   * Completely replace all values in GraphQL enum type
   * WARNING: this method rewrite an internal GraphQL instance properties.
   */
  setFields(values: GraphQLEnumValueConfigMap): EnumTypeComposer {
    // cleanup isDepricated
    Object.keys(values).forEach(key => {
      // $FlowFixMe
      delete values[key].isDeprecated; // eslint-disable-line
    });

    this.gqType._enumConfig.values = values;

    // clear builded fields in type
    delete this.gqType._values;
    delete this.gqType._valueLookup;
    delete this.gqType._nameLookup;

    this._fixEnumBelowV13();

    return this;
  }

  setField(name: string, valueConfig: GraphQLEnumValueConfig): EnumTypeComposer {
    this.addFields({ [name]: valueConfig });
    return this;
  }

  /**
   * Add new fields or replace existed in a GraphQL type
   */
  addFields(newValues: GraphQLEnumValueConfigMap): EnumTypeComposer {
    this.setFields({ ...this.getFields(), ...newValues });
    return this;
  }

  removeField(nameOrArray: string | Array<string>): EnumTypeComposer {
    const valueNames = Array.isArray(nameOrArray) ? nameOrArray : [nameOrArray];
    const values = this.getFields();
    valueNames.forEach(valueName => delete values[valueName]);
    this.setFields({ ...values });
    return this;
  }

  removeOtherFields(fieldNameOrArray: string | Array<string>): EnumTypeComposer {
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

  reorderFields(names: string[]): EnumTypeComposer {
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

  extendField(name: string, partialValueConfig: $Shape<GraphQLEnumValueConfig>): EnumTypeComposer {
    let prevValueConfig;
    try {
      prevValueConfig = this.getField(name);
    } catch (e) {
      throw new Error(
        `Cannot extend value '${name}' from enum '${this.getTypeName()}'. Value does not exist.`
      );
    }

    const valueConfig: GraphQLEnumValueConfig = {
      ...(prevValueConfig: any),
      ...(partialValueConfig: any),
    };
    this.setField(name, valueConfig);
    return this;
  }

  getType(): GraphQLEnumType {
    return this.gqType;
  }

  getTypePlural(): GraphQLList<GraphQLEnumType> {
    return new GraphQLList(this.gqType);
  }

  getTypeNonNull(): GraphQLNonNull<GraphQLEnumType> {
    return new GraphQLNonNull(this.gqType);
  }

  getTypeName(): string {
    return this.gqType.name;
  }

  setTypeName(name: string): EnumTypeComposer {
    this.gqType.name = name;
    this.gqType._enumConfig.name = name;
    return this;
  }

  getDescription(): string {
    return this.gqType.description || '';
  }

  setDescription(description: string): EnumTypeComposer {
    this.gqType.description = description;
    this.gqType._enumConfig.description = description;
    return this;
  }

  deprecateFields(fields: { [fieldName: string]: string } | string[] | string): this {
    const existedFieldNames = this.getFieldNames();

    if (typeof fields === 'string') {
      if (existedFieldNames.indexOf(fields) === -1) {
        throw new Error(
          `Cannot deprecate unexisted value '${fields}' from enum '${this.getTypeName()}'`
        );
      }
      this.extendField(fields, { deprecationReason: 'deprecated' });
    } else if (Array.isArray(fields)) {
      fields.forEach(field => {
        if (existedFieldNames.indexOf(field) === -1) {
          throw new Error(
            `Cannot deprecate unexisted value '${field}' from enum '${this.getTypeName()}'`
          );
        }
        this.extendField(field, { deprecationReason: 'deprecated' });
      });
    } else {
      const fieldMap: Object = (fields: any);
      Object.keys(fieldMap).forEach(field => {
        if (existedFieldNames.indexOf(field) === -1) {
          throw new Error(
            `Cannot deprecate unexisted value '${field}' from enum '${this.getTypeName()}'`
          );
        }
        const deprecationReason: string = fieldMap[field];
        this.extendField(field, { deprecationReason });
      });
    }

    return this;
  }

  clone(newTypeName: string): EnumTypeComposer {
    if (!newTypeName) {
      throw new Error('You should provide newTypeName:string for EnumTypeComposer.clone()');
    }

    const values = this.getFields();
    const newValues = {};
    Object.keys(values).forEach(fieldName => {
      newValues[fieldName] = { ...values[fieldName] };
      delete newValues[fieldName].isDeprecated;
    });

    const cloned = new this.constructor._schema.EnumTypeComposer(
      new GraphQLEnumType({
        name: newTypeName,
        values: newValues,
      })
    );

    cloned.setDescription(this.getDescription());

    return cloned;
  }
}

function isPlainObj(obj) {
  return obj && typeof obj === 'object' && !Array.isArray(obj);
}

function defineEnumValues(
  type: GraphQLEnumType,
  valueMap: GraphQLEnumValueConfigMap /* <T> */
): Array<GraphQLEnumValue /* <T> */> {
  invariant(
    isPlainObj(valueMap),
    `${type.name} values must be an object with value names as keys.`
  );
  return Object.keys(valueMap).map(valueName => {
    const value = valueMap[valueName];
    invariant(
      isPlainObj(value),
      `${type.name}.${valueName} must refer to an object with a "value" key ` +
        `representing an internal value but got: ${String(value)}.`
    );
    invariant(
      !value.hasOwnProperty('isDeprecated'),
      `${type.name}.${valueName} should provide "deprecationReason" instead of "isDeprecated".`
    );
    return {
      name: valueName,
      description: value.description,
      isDeprecated: Boolean(value.deprecationReason),
      deprecationReason: value.deprecationReason,
      astNode: value.astNode,
      value: value.hasOwnProperty('value') ? value.value : valueName,
    };
  });
}
