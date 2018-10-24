/* @flow strict */
/* eslint-disable no-use-before-define */

import {
  GraphQLObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInputObjectType,
  getNamedType,
  GraphQLInterfaceType,
} from './graphql';
import type {
  GraphQLFieldConfig,
  GraphQLFieldConfigMap,
  GraphQLOutputType,
  GraphQLInputType,
  GraphQLFieldConfigArgumentMap,
  GraphQLArgumentConfig,
  GraphQLIsTypeOfFn,
  GraphQLResolveInfo,
  GraphQLFieldResolver,
} from './graphql';
import type { InputTypeComposer } from './InputTypeComposer';
import type { EnumTypeComposer } from './EnumTypeComposer';
import type { TypeAsString } from './TypeMapper';
import { InterfaceTypeComposer } from './InterfaceTypeComposer';
import {
  Resolver,
  type ResolverOpts,
  type ResolverNextRpCb,
  type ResolverWrapCb,
} from './Resolver';
import type { SchemaComposer } from './SchemaComposer';
import { resolveMaybeThunk, upperFirst, inspect } from './utils/misc';
import { isObject, isFunction, isString } from './utils/is';
import { resolveOutputConfigMapAsThunk, resolveOutputConfigAsThunk } from './utils/configAsThunk';
import { defineFieldMap, defineFieldMapToConfig } from './utils/configToDefine';
import { toInputObjectType } from './utils/toInputObjectType';
import { typeByPath } from './utils/typeByPath';
// import { deprecate } from './utils/debug';
import type { ProjectionType } from './utils/projection';
import type { ObjMap, Thunk } from './utils/definitions';
import { graphqlVersion } from './utils/graphqlVersion';

export type GetRecordIdFn<TSource, TContext> = (
  source: TSource,
  args?: ?mixed,
  context?: TContext
) => string;

export type GraphQLObjectTypeExtended<TSource, TContext> = GraphQLObjectType & {
  _gqcInputTypeComposer?: InputTypeComposer,
  _gqcResolvers?: Map<string, Resolver<TSource, TContext>>,
  _gqcGetRecordIdFn?: GetRecordIdFn<TSource, TContext>,
  _gqcRelations?: RelationThunkMap<TSource, TContext>,
  _gqcFields?: ComposeFieldConfigMap<TSource, TContext>,
  _gqcInterfaces?: Array<GraphQLInterfaceType | InterfaceTypeComposer<TContext>>,
  description?: ?string,
};

export type ComposeObjectTypeConfig<TSource, TContext> = {
  +name: string,
  +interfaces?: Thunk<?Array<GraphQLInterfaceType>>,
  +fields?: Thunk<ComposeFieldConfigMap<TSource, TContext>>,
  +isTypeOf?: ?GraphQLIsTypeOfFn<TSource, TContext>,
  +description?: ?string,
  +isIntrospection?: boolean,
};

// extended GraphQLFieldConfigMap
export type ComposeFieldConfigMap<TSource, TContext> = ObjMap<
  ComposeFieldConfig<TSource, TContext>
>;

export type ComposeFieldConfig<TSource, TContext> =
  | ComposeFieldConfigAsObject<TSource, TContext>
  | ComposeOutputType<TContext>
  | (() => ComposeFieldConfigAsObject<TSource, TContext> | ComposeOutputType<TContext>);

// extended GraphQLFieldConfig
export type GraphqlFieldConfigExtended<TSource, TContext> = GraphQLFieldConfig<
  TSource,
  TContext
> & { projection?: any };

export type ComposeFieldConfigAsObject<TSource, TContext> = {
  +type: Thunk<ComposeOutputType<TContext>> | GraphQLOutputType,
  +args?: ComposeFieldConfigArgumentMap,
  +resolve?: GraphQLFieldResolver<TSource, TContext>,
  +subscribe?: GraphQLFieldResolver<TSource, TContext>,
  +deprecationReason?: ?string,
  +description?: ?string,
  // +astNode?: any,
  +[key: string]: any,
};

export type ComposePartialFieldConfigAsObject<TSource, TContext> = {
  +type?: Thunk<ComposeOutputType<TContext>> | GraphQLOutputType,
  +args?: ComposeFieldConfigArgumentMap,
  +resolve?: GraphQLFieldResolver<TSource, TContext>,
  +subscribe?: GraphQLFieldResolver<TSource, TContext>,
  +deprecationReason?: ?string,
  +description?: ?string,
  +[key: string]: any,
};

// extended GraphQLOutputType
export type ComposeOutputType<TContext> =
  | GraphQLOutputType
  | TypeComposer<TContext>
  | EnumTypeComposer
  | TypeAsString
  | Resolver<any, TContext>
  | InterfaceTypeComposer<TContext>
  | Array<ComposeOutputType<TContext>>;

// Compose Args -----------------------------
export type ComposeArgumentType =
  | GraphQLInputType
  | TypeAsString
  | InputTypeComposer
  | EnumTypeComposer
  | Array<ComposeArgumentType>;
export type ComposeArgumentConfigAsObject = {
  +type: Thunk<ComposeArgumentType> | GraphQLInputType,
  +defaultValue?: mixed,
  +description?: ?string,
  // +astNode?: any,
  +[key: string]: any,
};
export type ComposePartialArgumentConfigAsObject = {
  +type: Thunk<ComposeArgumentType> | GraphQLInputType,
  +defaultValue?: mixed,
  +description?: ?string,
  +[key: string]: any,
};
export type ComposeArgumentConfig =
  | ComposeArgumentConfigAsObject
  | ComposeArgumentType
  | (() => ComposeArgumentConfigAsObject | ComposeArgumentType);
export type ComposeFieldConfigArgumentMap = ObjMap<ComposeArgumentConfig>;

// RELATION -----------------------------
export type RelationThunkMap<TSource, TContext> = {
  [fieldName: string]: Thunk<RelationOpts<TSource, TContext>>,
};
export type RelationOpts<TSource, TContext> =
  | RelationOptsWithResolver<TSource, TContext>
  | RelationOptsWithFieldConfig<TSource, TContext>;
export type RelationOptsWithResolver<TSource, TContext> = {
  +resolver: Thunk<Resolver<TSource, TContext>>,
  +prepareArgs?: RelationArgsMapper<TSource, TContext>,
  +projection?: ProjectionType,
  +description?: ?string,
  +deprecationReason?: ?string,
  +catchErrors?: boolean,
};
export type RelationOptsWithFieldConfig<TSource, TContext> = ComposeFieldConfigAsObject<
  TSource,
  TContext
> & { resolve: GraphQLFieldResolver<TSource, TContext> };
export type ArgsType = { [argName: string]: any };
export type RelationArgsMapperFn<TSource, TContext> = (
  source: TSource,
  args: ArgsType,
  context: TContext,
  info: GraphQLResolveInfo
) => any;
export type RelationArgsMapper<TSource, TContext> = {
  [argName: string]:
    | { [key: string]: any }
    | RelationArgsMapperFn<TSource, TContext>
    | null
    | void
    | string
    | number
    | Array<any>,
};

export class TypeComposer<TContext> {
  gqType: GraphQLObjectTypeExtended<any, TContext>;
  static schemaComposer: SchemaComposer<TContext>;

  get schemaComposer(): SchemaComposer<TContext> {
    return this.constructor.schemaComposer;
  }

  static create(
    opts: TypeAsString | ComposeObjectTypeConfig<any, TContext> | GraphQLObjectType
  ): TypeComposer<TContext> {
    const tc = this.createTemp(opts);
    const typeName = tc.getTypeName();
    if (typeName !== 'Query' && typeName !== 'Mutation' && typeName !== 'Subscription') {
      this.schemaComposer.add(tc);
    }
    return tc;
  }

  static createTemp(
    opts: TypeAsString | ComposeObjectTypeConfig<any, TContext> | GraphQLObjectType
  ): TypeComposer<TContext> {
    if (!this.schemaComposer) {
      throw new Error('Class<TypeComposer> must be created by a SchemaComposer.');
    }

    let TC;

    if (isString(opts)) {
      const typeName: string = opts;
      const NAME_RX = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
      if (NAME_RX.test(typeName)) {
        TC = new this.schemaComposer.TypeComposer(
          new GraphQLObjectType({
            name: typeName,
            fields: () => ({}),
          })
        );
      } else {
        const type = this.schemaComposer.typeMapper.createType(typeName);
        if (!(type instanceof GraphQLObjectType)) {
          throw new Error(
            'You should provide correct GraphQLObjectType type definition.' +
              'Eg. `type MyType { name: String }`'
          );
        }
        TC = new this.schemaComposer.TypeComposer(type);
      }
    } else if (opts instanceof GraphQLObjectType) {
      TC = new this.schemaComposer.TypeComposer(opts);
    } else if (isObject(opts)) {
      const fields = opts.fields;
      const type = new GraphQLObjectType({
        ...(opts: any),
        fields: isFunction(fields)
          ? () => resolveOutputConfigMapAsThunk(this.schemaComposer, (fields(): any), opts.name)
          : () => ({}),
      });
      TC = new this.schemaComposer.TypeComposer(type);
      if (isObject(fields)) TC.addFields(fields);
    } else {
      throw new Error(
        'You should provide GraphQLObjectTypeConfig or string with type name to TypeComposer.create(opts)'
      );
    }

    return TC;
  }

  constructor(gqType: GraphQLObjectType): TypeComposer<TContext> {
    if (!this.schemaComposer) {
      throw new Error('Class<TypeComposer> can only be created by a SchemaComposer.');
    }

    if (!(gqType instanceof GraphQLObjectType)) {
      throw new Error('TypeComposer accept only GraphQLObjectType in constructor');
    }
    this.gqType = gqType;

    // Alive proper Flow type casting in autosuggestions for class with Generics
    // it's required due using <TContext>
    // and Class<> utility type in SchemaComposer
    /* :: return this; */
  }

  // -----------------------------------------------
  // Field methods
  // -----------------------------------------------

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

  getFieldNames(): string[] {
    return Object.keys(this.getFields());
  }

  setFields(fields: ComposeFieldConfigMap<any, TContext>): TypeComposer<TContext> {
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

  hasField(fieldName: string): boolean {
    const fields = this.getFields();
    return !!fields[fieldName];
  }

  setField(
    fieldName: string,
    fieldConfig: ComposeFieldConfig<any, TContext>
  ): TypeComposer<TContext> {
    this.addFields({ [fieldName]: fieldConfig });

    return this;
  }

  /**
   * Add new fields or replace existed in a GraphQL type
   */
  addFields(newFields: ComposeFieldConfigMap<any, TContext>): TypeComposer<TContext> {
    this.setFields({ ...this.getFields(), ...newFields });
    return this;
  }

  /**
   * Add new fields or replace existed (where field name may have dots)
   */
  addNestedFields(newFields: ComposeFieldConfigMap<any, TContext>): TypeComposer<TContext> {
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
          childTC = this.schemaComposer.TypeComposer.createTemp(
            `${this.getTypeName()}${upperFirst(name)}`
          );
          this.setField(name, {
            type: childTC,
            resolve: () => ({}),
          });
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
  getField(fieldName: string): ComposeFieldConfig<any, TContext> {
    const fields = this.getFields();

    if (!fields[fieldName]) {
      throw new Error(
        `Cannot get field '${fieldName}' from type '${this.getTypeName()}'. Field does not exist.`
      );
    }

    return fields[fieldName];
  }

  removeField(fieldNameOrArray: string | Array<string>): TypeComposer<TContext> {
    const fieldNames = Array.isArray(fieldNameOrArray) ? fieldNameOrArray : [fieldNameOrArray];
    const fields = this.getFields();
    fieldNames.forEach(fieldName => delete fields[fieldName]);
    this.setFields({ ...fields });
    return this;
  }

  removeOtherFields(fieldNameOrArray: string | Array<string>): TypeComposer<TContext> {
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
    parialFieldConfig: ComposePartialFieldConfigAsObject<any, TContext>
  ): TypeComposer<TContext> {
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

  reorderFields(names: string[]): TypeComposer<TContext> {
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

  makeFieldNonNull(fieldNameOrArray: string | Array<string>): TypeComposer<TContext> {
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

  makeFieldNullable(fieldNameOrArray: string | Array<string>): TypeComposer<TContext> {
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

  deprecateFields(
    fields: { [fieldName: string]: string } | string[] | string
  ): TypeComposer<TContext> {
    const existedFieldNames = this.getFieldNames();

    if (typeof fields === 'string') {
      if (existedFieldNames.indexOf(fields) === -1) {
        throw new Error(
          `Cannot deprecate unexisted field '${fields}' from type '${this.getTypeName()}'`
        );
      }
      this.extendField(fields, { deprecationReason: 'deprecated' });
    } else if (Array.isArray(fields)) {
      fields.forEach(field => {
        if (existedFieldNames.indexOf(field) === -1) {
          throw new Error(
            `Cannot deprecate unexisted field '${field}' from type '${this.getTypeName()}'`
          );
        }
        this.extendField(field, { deprecationReason: 'deprecated' });
      });
    } else {
      const fieldMap: Object = (fields: any);
      Object.keys(fieldMap).forEach(field => {
        if (existedFieldNames.indexOf(field) === -1) {
          throw new Error(
            `Cannot deprecate unexisted field '${field}' from type '${this.getTypeName()}'`
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
    try {
      const fieldArgs = this.getFieldArgs(fieldName);
      return !!fieldArgs[argName];
    } catch (e) {
      return false;
    }
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

  getType(): GraphQLObjectType {
    return this.gqType;
  }

  getTypePlural(): GraphQLList<GraphQLObjectType> {
    return new GraphQLList(this.gqType);
  }

  getTypeNonNull(): GraphQLNonNull<GraphQLObjectType> {
    return new GraphQLNonNull(this.gqType);
  }

  getTypeName(): string {
    return this.gqType.name;
  }

  setTypeName(name: string): TypeComposer<TContext> {
    this.gqType.name = name;
    this.schemaComposer.add(this);
    return this;
  }

  getDescription(): string {
    return this.gqType.description || '';
  }

  setDescription(description: string): TypeComposer<TContext> {
    this.gqType.description = description;
    return this;
  }

  clone(newTypeName: string): TypeComposer<TContext> {
    if (!newTypeName) {
      throw new Error('You should provide newTypeName:string for TypeComposer.clone()');
    }

    const newFields = {};
    this.getFieldNames().forEach(fieldName => {
      const fc = this.getFieldConfig(fieldName);
      newFields[fieldName] = { ...(fc: any) };
    });

    const cloned = new this.schemaComposer.TypeComposer(
      new GraphQLObjectType({
        name: newTypeName,
        fields: newFields,
      })
    );

    cloned.setDescription(this.getDescription());
    try {
      cloned.setRecordIdFn(this.getRecordIdFn());
    } catch (e) {
      // no problem, clone without resolveIdFn
    }
    this.getResolvers().forEach(resolver => {
      const newResolver = resolver.clone();
      cloned.addResolver(newResolver);
    });

    return cloned;
  }

  // -----------------------------------------------
  // InputType methods
  // -----------------------------------------------

  getInputType(): GraphQLInputObjectType {
    return this.getInputTypeComposer().getType();
  }

  hasInputTypeComposer(): boolean {
    return !!this.gqType._gqcInputTypeComposer;
  }

  getInputTypeComposer(): InputTypeComposer {
    if (!this.gqType._gqcInputTypeComposer) {
      this.gqType._gqcInputTypeComposer = toInputObjectType(this);
    }

    return this.gqType._gqcInputTypeComposer;
  }

  // Alias for getInputTypeComposer()
  getITC(): InputTypeComposer {
    return this.getInputTypeComposer();
  }

  // -----------------------------------------------
  // Resolver methods
  // -----------------------------------------------

  getResolvers(): Map<string, Resolver<any, TContext>> {
    if (!this.gqType._gqcResolvers) {
      this.gqType._gqcResolvers = new Map();
    }
    return this.gqType._gqcResolvers;
  }

  hasResolver(name: string): boolean {
    if (!this.gqType._gqcResolvers) {
      return false;
    }
    return this.gqType._gqcResolvers.has(name);
  }

  getResolver(name: string): Resolver<any, TContext> {
    if (!this.hasResolver(name)) {
      throw new Error(`Type ${this.getTypeName()} does not have resolver with name '${name}'`);
    }
    const resolverMap: any = this.gqType._gqcResolvers;
    return resolverMap.get(name);
  }

  setResolver(name: string, resolver: Resolver<any, TContext>): TypeComposer<TContext> {
    if (!this.gqType._gqcResolvers) {
      this.gqType._gqcResolvers = new Map();
    }
    if (!(resolver instanceof Resolver)) {
      throw new Error('setResolver() accept only Resolver instance');
    }
    this.gqType._gqcResolvers.set(name, resolver);
    resolver.setDisplayName(`${this.getTypeName()}.${resolver.name}`);
    return this;
  }

  addResolver(opts: Resolver<any, TContext> | ResolverOpts<any, TContext>): TypeComposer<TContext> {
    if (!opts) {
      throw new Error('addResolver called with empty Resolver');
    }

    let resolver: Resolver<any, TContext>;
    if (!(opts instanceof Resolver)) {
      const resolverOpts = { ...opts };
      // add resolve method, otherwise added resolver will not return any data by graphql-js
      if (!resolverOpts.hasOwnProperty('resolve')) {
        resolverOpts.resolve = () => ({});
      }
      resolver = new this.schemaComposer.Resolver((resolverOpts: ResolverOpts<any, TContext>));
    } else {
      resolver = opts;
    }

    if (!resolver.name) {
      throw new Error('resolver should have non-empty `name` property');
    }
    this.setResolver(resolver.name, resolver);
    return this;
  }

  removeResolver(resolverName: string): TypeComposer<TContext> {
    if (resolverName) {
      this.getResolvers().delete(resolverName);
    }
    return this;
  }

  wrapResolver(
    resolverName: string,
    cbResolver: ResolverWrapCb<any, TContext>
  ): TypeComposer<TContext> {
    const resolver = this.getResolver(resolverName);
    const newResolver = resolver.wrap(cbResolver);
    this.setResolver(resolverName, newResolver);
    return this;
  }

  wrapResolverAs(
    resolverName: string,
    fromResolverName: string,
    cbResolver: ResolverWrapCb<any, TContext>
  ): TypeComposer<TContext> {
    const resolver = this.getResolver(fromResolverName);
    const newResolver = resolver.wrap(cbResolver);
    this.setResolver(resolverName, newResolver);
    return this;
  }

  wrapResolverResolve(
    resolverName: string,
    cbNextRp: ResolverNextRpCb<any, TContext>
  ): TypeComposer<TContext> {
    const resolver = this.getResolver(resolverName);
    this.setResolver(resolverName, resolver.wrapResolve(cbNextRp));
    return this;
  }

  // -----------------------------------------------
  // Interface methods
  // -----------------------------------------------

  getInterfaces(): Array<GraphQLInterfaceType | InterfaceTypeComposer<TContext>> {
    if (!this.gqType._gqcInterfaces) {
      let interfaces: any;
      if (graphqlVersion >= 14) {
        interfaces = this.gqType._interfaces;
      } else {
        // $FlowFixMe
        interfaces = this.gqType._typeConfig.interfaces;
      }
      this.gqType._gqcInterfaces = (resolveMaybeThunk(interfaces) || []: any);
    }

    return this.gqType._gqcInterfaces;
  }

  setInterfaces(
    interfaces: Array<GraphQLInterfaceType | InterfaceTypeComposer<TContext>>
  ): TypeComposer<TContext> {
    this.gqType._gqcInterfaces = interfaces;
    const interfacesThunk = () => {
      return interfaces.map(iface => {
        if (iface instanceof GraphQLInterfaceType) {
          return iface;
        } else if (iface instanceof InterfaceTypeComposer) {
          return iface.getType();
        }
        throw new Error(
          `For type ${this.getTypeName()} you provide incorrect interface object ${inspect(iface)}`
        );
      });
    };

    if (graphqlVersion >= 14) {
      this.gqType._interfaces = interfacesThunk;
    } else {
      // $FlowFixMe
      this.gqType._typeConfig.interfaces = interfacesThunk;
      delete this.gqType._interfaces; // if schema was builded, delete _interfaces
    }
    return this;
  }

  hasInterface(interfaceObj: GraphQLInterfaceType | InterfaceTypeComposer<TContext>): boolean {
    return this.getInterfaces().indexOf(interfaceObj) > -1;
  }

  addInterface(
    interfaceObj: GraphQLInterfaceType | InterfaceTypeComposer<TContext>
  ): TypeComposer<TContext> {
    if (!this.hasInterface(interfaceObj)) {
      this.setInterfaces([...this.getInterfaces(), interfaceObj]);
    }
    return this;
  }

  removeInterface(
    interfaceObj: GraphQLInterfaceType | InterfaceTypeComposer<TContext>
  ): TypeComposer<TContext> {
    const interfaces = this.getInterfaces();
    const idx = interfaces.indexOf(interfaceObj);
    if (idx > -1) {
      interfaces.splice(idx, 1);
      this.setInterfaces(interfaces);
    }
    return this;
  }

  // -----------------------------------------------
  // Misc methods
  // -----------------------------------------------

  addRelation<TSource>(
    fieldName: string,
    opts: RelationOpts<TSource, TContext>
  ): TypeComposer<TContext> {
    if (!this.gqType._gqcRelations) {
      this.gqType._gqcRelations = {};
    }
    this.gqType._gqcRelations[fieldName] = opts;

    if (opts.hasOwnProperty('resolver')) {
      this.setField(fieldName, () => {
        return this._relationWithResolverToFC(opts, fieldName);
      });
    } else if (opts.hasOwnProperty('type')) {
      const fc: RelationOptsWithFieldConfig<TSource, TContext> = (opts: any);
      this.setField(fieldName, fc); // was: () => fc
    }

    return this;
  }

  getRelations(): RelationThunkMap<any, TContext> {
    if (!this.gqType._gqcRelations) {
      this.gqType._gqcRelations = {};
    }
    return this.gqType._gqcRelations;
  }

  _relationWithResolverToFC<TSource>(
    opts: RelationOptsWithResolver<TSource, TContext>,
    fieldName?: string = ''
  ): ComposeFieldConfigAsObject<TSource, TContext> {
    const resolver = isFunction(opts.resolver) ? opts.resolver() : opts.resolver;

    if (!(resolver instanceof Resolver)) {
      throw new Error(
        'You should provide correct Resolver object for relation ' +
          `${this.getTypeName()}.${fieldName}`
      );
    }
    if ((opts: any).type) {
      throw new Error(
        'You can not use `resolver` and `type` properties simultaneously for relation ' +
          `${this.getTypeName()}.${fieldName}`
      );
    }
    if ((opts: any).resolve) {
      throw new Error(
        'You can not use `resolver` and `resolve` properties simultaneously for relation ' +
          `${this.getTypeName()}.${fieldName}`
      );
    }

    const fieldConfig = resolver.getFieldConfig();
    const argsConfig = { ...fieldConfig.args };
    const argsProto = {};
    const argsRuntime: [string, RelationArgsMapperFn<TSource, TContext>][] = [];

    // remove args from config, if arg name provided in args
    //    if `argMapVal`
    //       is `undefined`, then keep arg field in config
    //       is `null`, then just remove arg field from config
    //       is `function`, then remove arg field and run it in resolve
    //       is any other value, then put it to args prototype for resolve
    const optsArgs = opts.prepareArgs || {};

    Object.keys(optsArgs).forEach(argName => {
      const argMapVal = optsArgs[argName];
      if (argMapVal !== undefined) {
        delete argsConfig[argName];

        if (isFunction(argMapVal)) {
          argsRuntime.push([argName, argMapVal]);
        } else if (argMapVal !== null) {
          argsProto[argName] = argMapVal;
        }
      }
    });

    // if opts.catchErrors is undefined then set true, otherwise take it value
    const { catchErrors = true } = opts;

    const resolve = (source, args, context, info) => {
      const newArgs = { ...args, ...argsProto };
      argsRuntime.forEach(([argName, argFn]) => {
        newArgs[argName] = argFn(source, args, context, info);
      });

      const payload = fieldConfig.resolve
        ? fieldConfig.resolve(source, newArgs, context, info)
        : null;
      return catchErrors
        ? Promise.resolve(payload).catch(e => {
            // eslint-disable-next-line
            console.log(`GQC ERROR: relation for ${this.getTypeName()}.${fieldName} throws error:`);
            console.log(e); // eslint-disable-line
            return null;
          })
        : payload;
    };

    return {
      type: fieldConfig.type,
      description: opts.description,
      deprecationReason: opts.deprecationReason,
      args: argsConfig,
      resolve,
      projection: opts.projection,
    };
  }

  setRecordIdFn(fn: GetRecordIdFn<any, TContext>): TypeComposer<TContext> {
    this.gqType._gqcGetRecordIdFn = fn;
    return this;
  }

  hasRecordIdFn(): boolean {
    return !!this.gqType._gqcGetRecordIdFn;
  }

  getRecordIdFn(): GetRecordIdFn<any, TContext> {
    if (!this.gqType._gqcGetRecordIdFn) {
      throw new Error(`Type ${this.getTypeName()} does not have RecordIdFn`);
    }
    return this.gqType._gqcGetRecordIdFn;
  }

  /**
   * Get function that returns record id, from provided object.
   */
  getRecordId(source: ?mixed, args: ?mixed, context: TContext): string | number {
    return this.getRecordIdFn()(source, args, context);
  }

  get(path: string | Array<string>): any {
    return typeByPath(this, path);
  }
}
