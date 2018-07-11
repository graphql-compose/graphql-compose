/* @flow strict */
/* eslint-disable no-use-before-define */

// import invariant from 'graphql/jsutils/invariant';
import {
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLList,
  GraphQLNonNull,
  getNamedType,
} from './graphql';
import { isObject, isString } from './utils/is';
import { resolveMaybeThunk } from './utils/misc';
import { TypeComposer } from './TypeComposer';
import type {
  GraphQLFieldConfig,
  GraphQLFieldConfigMap,
  GraphQLOutputType,
  GraphQLInputType,
  GraphQLFieldConfigArgumentMap,
  GraphQLArgumentConfig,
  GraphQLTypeResolver,
} from './graphql';
import type { TypeAsString } from './TypeMapper';
import type { SchemaComposer } from './SchemaComposer';
import type {
  ComposeFieldConfigMap,
  ComposeFieldConfig,
  ComposePartialFieldConfigAsObject,
} from './TypeComposer';
import type { Thunk } from './utils/definitions';
import { resolveOutputConfigMapAsThunk, resolveOutputConfigAsThunk } from './utils/configAsThunk';
import { typeByPath } from './utils/typeByPath';

export type GraphQLInterfaceTypeExtended<TSource, TContext> = GraphQLInterfaceType & {
  _gqcFields?: ComposeFieldConfigMap<TSource, TContext>,
};

export type ComposeInterfaceTypeConfig<TSource, TContext> = {
  +name: string,
  +fields?: Thunk<ComposeFieldConfigMap<TSource, TContext>>,
  +resolveType?: ?GraphQLTypeResolver<TSource, TContext>,
  +description?: ?string,
};

export class InterfaceTypeComposer<TContext> {
  gqType: GraphQLInterfaceTypeExtended<any, TContext>;

  static schemaComposer: SchemaComposer<any>;

  static create(
    opts: TypeAsString | ComposeInterfaceTypeConfig<any, TContext> | GraphQLInterfaceType
  ): InterfaceTypeComposer<TContext> {
    const ftc = this.createTemp(opts);
    this.schemaComposer.add(ftc);
    return ftc;
  }

  static createTemp(
    opts: TypeAsString | ComposeInterfaceTypeConfig<any, TContext> | GraphQLInterfaceType
  ): InterfaceTypeComposer<TContext> {
    if (!this.schemaComposer) {
      throw new Error('Class<InterfaceTypeComposer> must be created by a SchemaComposer.');
    }

    let FTC;

    if (isString(opts)) {
      const typeName: string = opts;
      const NAME_RX = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
      if (NAME_RX.test(typeName)) {
        FTC = new this.schemaComposer.InterfaceTypeComposer(
          new GraphQLInterfaceType({
            name: typeName,
            fields: () => ({}),
          })
        );
      } else {
        const type = this.schemaComposer.typeMapper.createType(typeName);
        if (!(type instanceof GraphQLInterfaceType)) {
          throw new Error(
            'You should provide correct GraphQLInterfaceType type definition.' +
              'Eg. `interface MyType { id: ID!, name: String! }`'
          );
        }
        FTC = new this.schemaComposer.InterfaceTypeComposer(type);
      }
    } else if (opts instanceof GraphQLInterfaceType) {
      FTC = new this.schemaComposer.InterfaceTypeComposer(opts);
    } else if (isObject(opts)) {
      const type = new GraphQLInterfaceType({
        ...(opts: any),
      });
      FTC = new this.schemaComposer.InterfaceTypeComposer(type);
    } else {
      throw new Error(
        'You should provide GraphQLInterfaceTypeConfig or string with enum name or SDL'
      );
    }

    return FTC;
  }

  constructor(gqType: GraphQLInterfaceType) {
    if (!this.constructor.schemaComposer) {
      throw new Error('Class<InterfaceTypeComposer> can only be created by a SchemaComposer.');
    }

    if (!(gqType instanceof GraphQLInterfaceType)) {
      throw new Error('InterfaceTypeComposer accept only GraphQLInterfaceType in constructor');
    }
    this.gqType = gqType;
  }

  // -----------------------------------------------
  // Field methods
  // -----------------------------------------------

  hasField(name: string): boolean {
    const fields = this.getFields();
    return !!fields[name];
  }

  getFields(): ComposeFieldConfigMap<any, TContext> {
    if (!this.gqType._gqcFields) {
      const fields: Thunk<GraphQLFieldConfigMap<any, TContext>> = this.gqType._typeConfig.fields;
      this.gqType._gqcFields = (resolveMaybeThunk(fields) || {}: any);
    }

    return this.gqType._gqcFields;
  }

  getField(name: string): ComposeFieldConfig<any, TContext> {
    const values = this.getFields();

    if (!values[name]) {
      throw new Error(
        `Cannot get field '${name}' from interface type '${this.getTypeName()}'. Field does not exist.`
      );
    }

    return values[name];
  }

  getFieldNames(): string[] {
    return Object.keys(this.getFields());
  }

  setFields(fields: ComposeFieldConfigMap<any, TContext>): InterfaceTypeComposer<TContext> {
    this.gqType._gqcFields = fields;

    this.gqType._typeConfig.fields = () => {
      return (resolveOutputConfigMapAsThunk(
        this.constructor.schemaComposer,
        fields,
        this.getTypeName()
      ): any);
    };
    delete this.gqType._fields; // clear builded fields in type
    return this;
  }

  setField(
    name: string,
    fieldConfig: ComposeFieldConfig<any, TContext>
  ): InterfaceTypeComposer<TContext> {
    this.addFields({ [name]: fieldConfig });
    return this;
  }

  /**
   * Add new fields or replace existed in a GraphQL type
   */
  addFields(newValues: ComposeFieldConfigMap<any, TContext>): InterfaceTypeComposer<TContext> {
    this.setFields({ ...this.getFields(), ...newValues });
    return this;
  }

  removeField(nameOrArray: string | Array<string>): InterfaceTypeComposer<TContext> {
    const fieldNames = Array.isArray(nameOrArray) ? nameOrArray : [nameOrArray];
    const values = this.getFields();
    fieldNames.forEach(valueName => delete values[valueName]);
    this.setFields({ ...values });
    return this;
  }

  removeOtherFields(fieldNameOrArray: string | Array<string>): InterfaceTypeComposer<TContext> {
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

  reorderFields(names: string[]): InterfaceTypeComposer<TContext> {
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

  extendField(
    fieldName: string,
    parialFieldConfig: ComposePartialFieldConfigAsObject<any, TContext>
  ): InterfaceTypeComposer<TContext> {
    let prevFieldConfig;
    try {
      prevFieldConfig = this.getFieldConfig(fieldName);
    } catch (e) {
      throw new Error(
        `Cannot extend field '${fieldName}' from type '${this.getTypeName()}'. Field does not exist.`
      );
    }

    this.setField(fieldName, {
      ...(prevFieldConfig: any),
      ...parialFieldConfig,
    });
    return this;
  }

  isFieldNonNull(fieldName: string): boolean {
    return this.getFieldType(fieldName) instanceof GraphQLNonNull;
  }

  getFieldConfig(fieldName: string): GraphQLFieldConfig<any, TContext> {
    const fc = this.getField(fieldName);
    if (!fc) {
      throw new Error(`Type ${this.getTypeName()} does not have field with name '${fieldName}'`);
    }

    return resolveOutputConfigAsThunk(
      this.constructor.schemaComposer,
      fc,
      fieldName,
      this.getTypeName()
    );
  }

  getFieldType(fieldName: string): GraphQLOutputType {
    return this.getFieldConfig(fieldName).type;
  }

  getFieldTC(fieldName: string): TypeComposer<TContext> {
    const fieldType = getNamedType(this.getFieldType(fieldName));
    if (!(fieldType instanceof GraphQLObjectType)) {
      throw new Error(
        `Cannot get TypeComposer for field '${fieldName}' in type ${this.getTypeName()}. ` +
          `This field should be ObjectType, but it has type '${fieldType.constructor.name}'`
      );
    }
    return this.constructor.schemaComposer.TypeComposer.createTemp(fieldType);
  }

  makeFieldNonNull(fieldNameOrArray: string | Array<string>): InterfaceTypeComposer<TContext> {
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

  makeFieldNullable(fieldNameOrArray: string | Array<string>): InterfaceTypeComposer<TContext> {
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

  deprecateFields(fields: { [fieldName: string]: string } | string[] | string): this {
    const existedFieldNames = this.getFieldNames();

    if (typeof fields === 'string') {
      if (existedFieldNames.indexOf(fields) === -1) {
        throw new Error(
          `Cannot deprecate unexisted field '${fields}' from interface type '${this.getTypeName()}'`
        );
      }
      this.extendField(fields, { deprecationReason: 'deprecated' });
    } else if (Array.isArray(fields)) {
      fields.forEach(field => {
        if (existedFieldNames.indexOf(field) === -1) {
          throw new Error(
            `Cannot deprecate unexisted field '${field}' from interface type '${this.getTypeName()}'`
          );
        }
        this.extendField(field, { deprecationReason: 'deprecated' });
      });
    } else {
      const fieldMap: Object = (fields: any);
      Object.keys(fieldMap).forEach(field => {
        if (existedFieldNames.indexOf(field) === -1) {
          throw new Error(
            `Cannot deprecate unexisted field '${field}' from interface type '${this.getTypeName()}'`
          );
        }
        const deprecationReason: string = fieldMap[field];
        this.extendField(field, { deprecationReason });
      });
    }

    return this;
  }

  getFieldArgs(fieldName: string): GraphQLFieldConfigArgumentMap {
    try {
      const fc = this.getFieldConfig(fieldName);
      return fc.args || {};
    } catch (e) {
      throw new Error(
        `Cannot get field args. Field '${fieldName}' from type '${this.getTypeName()}' does not exist.`
      );
    }
  }

  hasFieldArg(fieldName: string, argName: string): boolean {
    const fieldArgs = this.getFieldArgs(fieldName);
    return !!fieldArgs[argName];
  }

  getFieldArg(fieldName: string, argName: string): GraphQLArgumentConfig {
    const fieldArgs = this.getFieldArgs(fieldName);

    if (!fieldArgs[argName]) {
      throw new Error(
        `Cannot get arg '${argName}' from type.field '${this.getTypeName()}.${fieldName}'. Argument does not exist.`
      );
    }

    return fieldArgs[argName];
  }

  getFieldArgType(fieldName: string, argName: string): GraphQLInputType {
    const ac = this.getFieldArg(fieldName, argName);
    return ac.type;
  }

  // -----------------------------------------------
  // Type methods
  // -----------------------------------------------

  getType(): GraphQLInterfaceType {
    return this.gqType;
  }

  getTypePlural(): GraphQLList<GraphQLInterfaceType> {
    return new GraphQLList(this.gqType);
  }

  getTypeNonNull(): GraphQLNonNull<GraphQLInterfaceType> {
    return new GraphQLNonNull(this.gqType);
  }

  getTypeName(): string {
    return this.gqType.name;
  }

  setTypeName(name: string): InterfaceTypeComposer<TContext> {
    this.gqType.name = name;
    this.gqType._typeConfig.name = name;
    this.constructor.schemaComposer.add(this);
    return this;
  }

  getDescription(): string {
    return this.gqType.description || '';
  }

  setDescription(description: string): InterfaceTypeComposer<TContext> {
    this.gqType.description = description;
    this.gqType._typeConfig.description = description;
    return this;
  }

  clone(newTypeName: string): InterfaceTypeComposer<TContext> {
    if (!newTypeName) {
      throw new Error('You should provide newTypeName:string for InterfaceTypeComposer.clone()');
    }

    const newFields = {};
    this.getFieldNames().forEach(fieldName => {
      const fc = this.getFieldConfig(fieldName);
      newFields[fieldName] = { ...(fc: any) };
    });

    const cloned = new this.constructor.schemaComposer.InterfaceTypeComposer(
      new GraphQLInterfaceType({
        name: newTypeName,
        fields: newFields,
      })
    );

    cloned.setDescription(this.getDescription());

    return cloned;
  }

  // -----------------------------------------------
  // Misc methods
  // -----------------------------------------------

  get(path: string | Array<string>): any {
    return typeByPath(this, path);
  }
}
