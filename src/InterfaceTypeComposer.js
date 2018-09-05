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
import { isObject, isString, isFunction } from './utils/is';
import { resolveMaybeThunk, inspect } from './utils/misc';
import { TypeComposer } from './TypeComposer';
import type {
  GraphQLFieldConfig,
  GraphQLFieldConfigMap,
  GraphQLOutputType,
  GraphQLInputType,
  GraphQLFieldConfigArgumentMap,
  GraphQLArgumentConfig,
  GraphQLResolveInfo,
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
import { getGraphQLType } from './utils/typeHelpers';
import { defineFieldMap, defineFieldMapToConfig } from './utils/configToDefine';
import { graphqlVersion } from './utils/graphqlVersion';

export type GraphQLInterfaceTypeExtended<TSource, TContext> = GraphQLInterfaceType & {
  _gqcFields?: ComposeFieldConfigMap<TSource, TContext>,
  _gqcTypeResolvers?: InterfaceTypeResolversMap<TSource, TContext>,
};

export type InterfaceTypeResolversMap<TSource, TContext> = Map<
  TypeComposer<TContext> | GraphQLObjectType,
  InterfaceTypeResolverCheckFn<TSource, TContext>
>;

type MaybePromise<+T> = Promise<T> | T;

export type InterfaceTypeResolverCheckFn<TSource, TContext> = (
  value: TSource,
  context: TContext,
  info: GraphQLResolveInfo
) => MaybePromise<?boolean>;

export type ComposeInterfaceTypeConfig<TSource, TContext> = {
  +name: string,
  +fields?: Thunk<ComposeFieldConfigMap<TSource, TContext>>,
  +resolveType?: ?GraphQLTypeResolver<TSource, TContext>,
  +description?: ?string,
};

export class InterfaceTypeComposer<TContext> {
  gqType: GraphQLInterfaceTypeExtended<any, TContext>;

  static schemaComposer: SchemaComposer<TContext>;

  get schemaComposer(): SchemaComposer<TContext> {
    return this.constructor.schemaComposer;
  }

  // Also supported `GraphQLInterfaceType` but in such case Flowtype force developers
  // to explicitly write annotations in their code. But it's bad.
  static create(
    opts: TypeAsString | ComposeInterfaceTypeConfig<any, TContext>
  ): InterfaceTypeComposer<TContext> {
    const iftc = this.createTemp(opts);
    this.schemaComposer.add(iftc);
    return iftc;
  }

  static createTemp(
    opts: TypeAsString | ComposeInterfaceTypeConfig<any, TContext>
  ): InterfaceTypeComposer<TContext> {
    if (!this.schemaComposer) {
      throw new Error('Class<InterfaceTypeComposer> must be created by a SchemaComposer.');
    }

    let IFTC;

    if (isString(opts)) {
      const typeName: string = opts;
      const NAME_RX = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
      if (NAME_RX.test(typeName)) {
        IFTC = new this.schemaComposer.InterfaceTypeComposer(
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
        IFTC = new this.schemaComposer.InterfaceTypeComposer(type);
      }
    } else if (opts instanceof GraphQLInterfaceType) {
      IFTC = new this.schemaComposer.InterfaceTypeComposer(opts);
    } else if (isObject(opts)) {
      const fields = opts.fields;
      const type = new GraphQLInterfaceType({
        ...(opts: any),
        fields: isFunction(fields)
          ? () => resolveOutputConfigMapAsThunk(this.schemaComposer, (fields(): any), opts.name)
          : () => ({}),
      });
      IFTC = new this.schemaComposer.InterfaceTypeComposer(type);
      if (isObject(opts.fields)) IFTC.addFields(opts.fields);
    } else {
      throw new Error(
        'You should provide GraphQLInterfaceTypeConfig or string with enum name or SDL'
      );
    }

    return IFTC;
  }

  constructor(gqType: GraphQLInterfaceType) {
    if (!this.schemaComposer) {
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
      if (graphqlVersion >= 14) {
        this.gqType._gqcFields = (defineFieldMapToConfig(this.gqType._fields): any);
      } else {
        // $FlowFixMe
        const fields: Thunk<GraphQLFieldConfigMap<any, TContext>> = this.gqType._typeConfig.fields;
        this.gqType._gqcFields = (resolveMaybeThunk(fields) || {}: any);
      }
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

    if (graphqlVersion >= 14) {
      this.gqType._fields = () => {
        return defineFieldMap(
          this.gqType,
          resolveOutputConfigMapAsThunk(this.schemaComposer, fields, this.getTypeName())
        );
      };
    } else {
      // $FlowFixMe
      this.gqType._typeConfig.fields = () => {
        return resolveOutputConfigMapAsThunk(this.schemaComposer, fields, this.getTypeName());
      };
      delete this.gqType._fields; // clear builded fields in type
    }
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

    return resolveOutputConfigAsThunk(this.schemaComposer, fc, fieldName, this.getTypeName());
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
    return this.schemaComposer.TypeComposer.createTemp(fieldType);
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
    this.schemaComposer.add(this);
    return this;
  }

  getDescription(): string {
    return this.gqType.description || '';
  }

  setDescription(description: string): InterfaceTypeComposer<TContext> {
    this.gqType.description = description;
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

    const cloned = new this.schemaComposer.InterfaceTypeComposer(
      new GraphQLInterfaceType({
        name: newTypeName,
        fields: newFields,
      })
    );

    cloned.setDescription(this.getDescription());

    return cloned;
  }

  // -----------------------------------------------
  // ResolveType methods
  // -----------------------------------------------

  hasTypeResolver(type: TypeComposer<TContext> | GraphQLObjectType): boolean {
    const typeResolversMap = this.getTypeResolvers();
    return typeResolversMap.has(type);
  }

  getTypeResolvers(): InterfaceTypeResolversMap<any, TContext> {
    if (!this.gqType._gqcTypeResolvers) {
      this.gqType._gqcTypeResolvers = new Map();
    }
    return this.gqType._gqcTypeResolvers;
  }

  getTypeResolverCheckFn(
    type: TypeComposer<TContext> | GraphQLObjectType
  ): InterfaceTypeResolverCheckFn<any, TContext> {
    const typeResolversMap = this.getTypeResolvers();

    if (!typeResolversMap.has(type)) {
      throw new Error(
        `Type resolve function in interface '${this.getTypeName()}' is not defined for type ${inspect(
          type
        )}.`
      );
    }

    return (typeResolversMap.get(type): any);
  }

  getTypeResolverNames(): string[] {
    const typeResolversMap = this.getTypeResolvers();
    const names = [];
    typeResolversMap.forEach((resolveFn, composeType) => {
      if (composeType instanceof TypeComposer) {
        names.push(composeType.getTypeName());
      } else if (composeType && composeType.name) {
        names.push(composeType.name);
      }
    });
    return names;
  }

  getTypeResolverTypes(): GraphQLObjectType[] {
    const typeResolversMap = this.getTypeResolvers();
    const types = [];
    typeResolversMap.forEach((resolveFn, composeType) => {
      types.push(((getGraphQLType(composeType): any): GraphQLObjectType));
    });
    return types;
  }

  setTypeResolvers(
    typeResolversMap: InterfaceTypeResolversMap<any, TContext>
  ): InterfaceTypeComposer<TContext> {
    this._isTypeResolversValid(typeResolversMap);

    this.gqType._gqcTypeResolvers = typeResolversMap;

    // extract GraphQLObjectType from TypeComposer
    const fastEntries = [];
    for (const [composeType, checkFn] of typeResolversMap.entries()) {
      fastEntries.push([((getGraphQLType(composeType): any): GraphQLObjectType), checkFn]);
    }

    let resolveType;
    const isAsyncRuntime = this._isTypeResolversAsync(typeResolversMap);
    if (isAsyncRuntime) {
      resolveType = async (value, context, info) => {
        for (const [gqType, checkFn] of fastEntries) {
          // should we run checkFn simultaniously or in serial?
          // Current decision is: dont SPIKE event loop - run in serial (it may be changed in future)
          // eslint-disable-next-line no-await-in-loop
          if (await checkFn(value, context, info)) return gqType;
        }
        return null;
      };
    } else {
      resolveType = (value, context, info) => {
        for (const [gqType, checkFn] of fastEntries) {
          if (checkFn(value, context, info)) return gqType;
        }
        return null;
      };
    }

    this.gqType.resolveType = resolveType;
    return this;
  }

  _isTypeResolversValid(typeResolversMap: InterfaceTypeResolversMap<any, TContext>): true {
    if (!(typeResolversMap instanceof Map)) {
      throw new Error(
        `For interface ${this.getTypeName()} you should provide Map object for type resolvers.`
      );
    }

    for (const [composeType, checkFn] of typeResolversMap.entries()) {
      // checking composeType
      try {
        const type = getGraphQLType(composeType);
        if (!(type instanceof GraphQLObjectType)) throw new Error('Must be GraphQLObjectType');
      } catch (e) {
        throw new Error(
          `For interface type resolver ${this.getTypeName()} you must provide GraphQLObjectType or TypeComposer, but provided ${inspect(
            composeType
          )}`
        );
      }

      // checking checkFn
      if (!isFunction(checkFn)) {
        throw new Error(
          `Interface ${this.getTypeName()} has invalid check function for type ${inspect(
            composeType
          )}`
        );
      }
    }

    return true;
  }

  // eslint-disable-next-line class-methods-use-this
  _isTypeResolversAsync(typeResolversMap: InterfaceTypeResolversMap<any, TContext>): boolean {
    let res = false;
    for (const [, checkFn] of typeResolversMap.entries()) {
      try {
        const r = checkFn(({}: any), ({}: any), ({}: any));
        if (r instanceof Promise) {
          r.catch(() => {});
          res = true;
        }
      } catch (e) {
        // noop
      }
    }
    return res;
  }

  addTypeResolver(
    type: TypeComposer<TContext> | GraphQLObjectType,
    checkFn: InterfaceTypeResolverCheckFn<any, TContext>
  ): InterfaceTypeComposer<TContext> {
    const typeResolversMap = this.getTypeResolvers();
    typeResolversMap.set(type, checkFn);
    this.setTypeResolvers(typeResolversMap);
    return this;
  }

  removeTypeResolver(
    type: TypeComposer<TContext> | GraphQLObjectType
  ): InterfaceTypeComposer<TContext> {
    const typeResolversMap = this.getTypeResolvers();
    typeResolversMap.delete(type);
    this.setTypeResolvers(typeResolversMap);
    return this;
  }

  // -----------------------------------------------
  // Misc methods
  // -----------------------------------------------

  get(path: string | Array<string>): any {
    return typeByPath(this, path);
  }
}
