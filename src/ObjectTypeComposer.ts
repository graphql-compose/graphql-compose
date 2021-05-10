/* eslint-disable no-use-before-define */

import { GraphQLObjectType, GraphQLInputObjectType, GraphQLInterfaceType } from './graphql';
import type {
  GraphQLFieldConfig,
  GraphQLFieldConfigMap,
  GraphQLOutputType,
  GraphQLInputType,
  GraphQLIsTypeOfFn,
  GraphQLResolveInfo,
  GraphQLFieldResolver,
  FieldDefinitionNode,
  InputValueDefinitionNode,
} from './graphql';
import { InputTypeComposer } from './InputTypeComposer';
import { UnionTypeComposer } from './UnionTypeComposer';
import type { TypeAsString, TypeDefinitionString } from './TypeMapper';
import {
  InterfaceTypeComposer,
  InterfaceTypeComposerDefinition,
  InterfaceTypeComposerThunked,
} from './InterfaceTypeComposer';
import {
  Resolver,
  ResolverDefinition,
  ResolverNextRpCb,
  ResolverWrapCb,
  ResolverMiddleware,
} from './Resolver';
import { SchemaComposer } from './SchemaComposer';
import { ListComposer } from './ListComposer';
import { NonNullComposer } from './NonNullComposer';
import { ThunkComposer } from './ThunkComposer';
import { EnumTypeComposer } from './EnumTypeComposer';
import { resolveMaybeThunk, upperFirst, inspect, mapEachKey } from './utils/misc';
import { isObject, isFunction, isString } from './utils/is';
import {
  defineFieldMap,
  convertObjectFieldMapToConfig,
  convertInterfaceArrayAsThunk,
} from './utils/configToDefine';
import { toInputObjectType } from './utils/toInputType';
import type { ToInputTypeOpts } from './utils/toInputType';
import { typeByPath, TypeInPath } from './utils/typeByPath';
import {
  getComposeTypeName,
  unwrapOutputTC,
  unwrapInputTC,
  isTypeNameString,
  cloneTypeTo,
  replaceTC,
  NamedTypeComposer,
} from './utils/typeHelpers';
import type { ProjectionType } from './utils/projection';
import type {
  ObjMap,
  Thunk,
  ThunkWithSchemaComposer,
  Extensions,
  ExtensionsDirective,
  DirectiveArgs,
} from './utils/definitions';
import { graphqlVersion } from './utils/graphqlVersion';
import type {
  ComposeNamedInputType,
  ComposeInputType,
  ComposeInputTypeDefinition,
  ComposeOutputTypeDefinition,
  ComposeOutputType,
  ComposeNamedOutputType,
} from './utils/typeHelpers';
import { createThunkedObjectProxy } from './utils/createThunkedObjectProxy';
import { printObject, SchemaPrinterOptions } from './utils/schemaPrinter';
import { getObjectTypeDefinitionNode } from './utils/definitionNode';
import { getSortMethodFromOption } from './utils/sortTypes';

export type ObjectTypeComposerDefinition<TSource, TContext> =
  | TypeAsString
  | TypeDefinitionString
  | ObjectTypeComposerAsObjectDefinition<TSource, TContext>
  | Readonly<ObjectTypeComposer<TSource, TContext>>
  | Readonly<GraphQLObjectType>;

export type ObjectTypeComposerAsObjectDefinition<TSource, TContext> = {
  name: string;
  interfaces?: null | ThunkWithSchemaComposer<
    ReadonlyArray<InterfaceTypeComposerDefinition<any, TContext>>,
    SchemaComposer<TContext>
  >;
  fields?: ObjectTypeComposerFieldConfigMapDefinition<TSource, TContext>;
  isTypeOf?: null | GraphQLIsTypeOfFn<TSource, TContext>;
  description?: string | null;
  isIntrospection?: boolean;
  extensions?: Extensions;
};

export type ObjectTypeComposerFieldConfigMap<TSource, TContext> = ObjMap<
  ObjectTypeComposerFieldConfig<TSource, TContext>
>;
export type ObjectTypeComposerFieldConfigMapDefinition<TSource, TContext> = ObjMap<
  ObjectTypeComposerFieldConfigDefinition<TSource, TContext>
>;

export type ObjectTypeComposerFieldConfigDefinition<TSource, TContext, TArgs = any> =
  | ThunkWithSchemaComposer<
      ObjectTypeComposerFieldConfigAsObjectDefinition<TSource, TContext, TArgs>,
      SchemaComposer<TContext>
    >
  | ThunkWithSchemaComposer<ComposeOutputTypeDefinition<TContext>, SchemaComposer<TContext>>
  | Readonly<Resolver<any, TContext, any>>;

export type ObjectTypeComposerFieldConfigAsObjectDefinition<TSource, TContext, TArgs = any> = {
  type: ThunkWithSchemaComposer<
    ComposeOutputTypeDefinition<TContext> | Readonly<Resolver<any, TContext, any>>,
    SchemaComposer<TContext>
  >;
  args?: ObjectTypeComposerArgumentConfigMapDefinition<TArgs>;
  resolve?: GraphQLFieldResolver<TSource, TContext, TArgs>;
  subscribe?: GraphQLFieldResolver<TSource, TContext>;
  deprecationReason?: string | null;
  description?: string | null;
  extensions?: Extensions | undefined;
  [key: string]: any;
};

export type ObjectTypeComposerFieldConfig<TSource, TContext, TArgs = any> = {
  type: ComposeOutputType<TContext>;
  args?: ObjectTypeComposerArgumentConfigMap<TArgs>;
  resolve?: GraphQLFieldResolver<TSource, TContext, TArgs>;
  subscribe?: GraphQLFieldResolver<TSource, TContext>;
  deprecationReason?: string | null;
  description?: string | null;
  astNode?: FieldDefinitionNode | null;
  extensions?: Extensions;
  [key: string]: any;
};

// Compose Args -----------------------------

export type ObjectTypeComposerArgumentConfigMap<TArgs = Record<string, any>> = Record<
  keyof TArgs,
  ObjectTypeComposerArgumentConfig
>;

export type ObjectTypeComposerArgumentConfigMapDefinition<TArgs = Record<string, any>> = Record<
  keyof TArgs,
  ObjectTypeComposerArgumentConfigDefinition
>;

export type ObjectTypeComposerArgumentConfigAsObjectDefinition = {
  type: ThunkWithSchemaComposer<ComposeInputTypeDefinition, SchemaComposer<any>>;
  defaultValue?: any;
  description?: string | null;
  extensions?: Extensions;
  [key: string]: any;
};

export type ObjectTypeComposerArgumentConfig = {
  type: ComposeInputType;
  defaultValue?: any;
  description?: string | null;
  astNode?: InputValueDefinitionNode | null;
  extensions?: Extensions;
  [key: string]: any;
};

export type ObjectTypeComposerArgumentConfigDefinition =
  | ObjectTypeComposerArgumentConfigAsObjectDefinition
  | ThunkWithSchemaComposer<ComposeInputTypeDefinition, SchemaComposer<any>>;

// RELATION -----------------------------

export type ObjectTypeComposerRelationMap<TSource, TContext> = {
  [fieldName: string]: ObjectTypeComposerRelationOpts<any, TSource, TContext>;
};
export type ObjectTypeComposerRelationOpts<TRelationSource, TSource, TContext, TArgs = any> =
  | ObjectTypeComposerRelationOptsWithResolver<TRelationSource, TSource, TContext, TArgs>
  | ObjectTypeComposerFieldConfigAsObjectDefinition<TSource, TContext, TArgs>;
export type ObjectTypeComposerRelationOptsWithResolver<
  TRelationSource,
  TSource,
  TContext,
  TArgs = any
> = {
  resolver: ThunkWithSchemaComposer<
    Resolver<TRelationSource, TContext, TArgs>,
    SchemaComposer<TContext>
  >;
  prepareArgs?: ObjectTypeComposerRelationArgsMapper<TSource, TContext, TArgs>;
  projection?: ProjectionType;
  description?: string | null;
  deprecationReason?: string | null;
  catchErrors?: boolean;
  extensions?: Extensions;
};

export type ObjectTypeComposerRelationArgsMapperFn<
  TSource,
  TContext,
  TArgs = Record<string, any>
> = (source: TSource, args: TArgs, context: TContext, info: GraphQLResolveInfo) => any;
export type ObjectTypeComposerRelationArgsMapper<
  TSource,
  TContext,
  TArgs extends Record<string, any> = Record<string, any>
> = {
  [argName in keyof TArgs]:
    | { [key: string]: any }
    | ObjectTypeComposerRelationArgsMapperFn<TSource, TContext, TArgs>
    | null
    | void
    | string
    | number
    | any[];
};

export type ObjectTypeComposerGetRecordIdFn<TSource, TContext, TArgs = any> = (
  source: TSource,
  args?: TArgs,
  context?: TContext
) => string;

export type ObjectTypeComposerThunked<TReturn, TContext> =
  | ObjectTypeComposer<TReturn, TContext>
  | ThunkComposer<ObjectTypeComposer<TReturn, TContext>, GraphQLObjectType>;

/**
 * Main class that gets `GraphQLObjectType` and provide ability to change them.
 */
export class ObjectTypeComposer<TSource = any, TContext = any> {
  schemaComposer: SchemaComposer<TContext>;
  _gqType: GraphQLObjectType;
  _gqcInputTypeComposer: undefined | InputTypeComposer<TContext>;
  _gqcResolvers: undefined | Map<string, Resolver<TSource, TContext>>;
  _gqcGetRecordIdFn: undefined | ObjectTypeComposerGetRecordIdFn<TSource, TContext>;
  _gqcRelations: undefined | ObjectTypeComposerRelationMap<TSource, TContext>;
  _gqcFields: ObjectTypeComposerFieldConfigMap<TSource, TContext>;
  _gqcInterfaces: Array<InterfaceTypeComposerThunked<TSource, TContext>>;
  _gqcExtensions: undefined | Extensions;

  /**
   * Create `ObjectTypeComposer` with adding it by name to the `SchemaComposer`.
   */
  static create<TSrc = any, TCtx = any>(
    typeDef: ObjectTypeComposerDefinition<TSrc, TCtx>,
    schemaComposer: SchemaComposer<TCtx>
  ): ObjectTypeComposer<TSrc, TCtx> {
    if (!(schemaComposer instanceof SchemaComposer)) {
      throw new Error(
        'You must provide SchemaComposer instance as a second argument for `ObjectTypeComposer.create(typeDef, schemaComposer)`'
      );
    }

    if (schemaComposer.hasInstance(typeDef, ObjectTypeComposer)) {
      return schemaComposer.getOTC(typeDef);
    }

    const tc = this.createTemp(typeDef, schemaComposer);
    const typeName = tc.getTypeName();
    if (typeName !== 'Query' && typeName !== 'Mutation' && typeName !== 'Subscription') {
      schemaComposer.add(tc);
    }
    return tc;
  }

  /**
   * Create `ObjectTypeComposer` without adding it to the `SchemaComposer`.
   * This method may be useful in plugins, when you need to create type temporary.
   */
  static createTemp<TSrc = any, TCtx = any>(
    typeDef: ObjectTypeComposerDefinition<TSrc, TCtx>,
    schemaComposer?: SchemaComposer<TCtx>
  ): ObjectTypeComposer<TSrc, TCtx> {
    const sc = schemaComposer || new SchemaComposer();
    let TC;

    if (isString(typeDef)) {
      const typeName: string = typeDef;
      if (isTypeNameString(typeName)) {
        TC = new ObjectTypeComposer(
          new GraphQLObjectType({
            name: typeName,
            fields: () => ({}),
          }),
          sc
        );
      } else {
        TC = sc.typeMapper.convertSDLTypeDefinition(typeName);
        if (!(TC instanceof ObjectTypeComposer)) {
          throw new Error(
            'You should provide correct GraphQLObjectType type definition. ' +
              'Eg. `type MyType { name: String }`'
          );
        }
      }
    } else if (typeDef instanceof GraphQLObjectType) {
      TC = new ObjectTypeComposer(typeDef, sc);
    } else if (typeDef instanceof ObjectTypeComposer) {
      return typeDef;
    } else if (isObject(typeDef)) {
      const type = new GraphQLObjectType({
        ...typeDef,
        fields: () => ({}),
      } as any);
      TC = new ObjectTypeComposer(type, sc);

      const fields = (typeDef as any).fields;
      if (isFunction(fields)) {
        // `convertOutputFieldMapToConfig` helps to solve hoisting problems
        // rewrap fields `() => { f1: { type: A } }` -> `{ f1: { type: () => A } }`
        TC.addFields(convertObjectFieldMapToConfig(fields, sc));
      } else if (isObject(fields)) {
        TC.addFields(fields);
      }

      const interfaces = (typeDef as any).interfaces;
      if (Array.isArray(interfaces)) TC.setInterfaces(interfaces);
      else if (isFunction(interfaces)) {
        // rewrap interfaces `() => [i1, i2]` -> `[()=>i1, ()=>i2]`
        // helps to solve hoisting problems
        TC.setInterfaces(convertInterfaceArrayAsThunk(interfaces, sc));
      }

      TC._gqcExtensions = (typeDef as any).extensions || {};
    } else {
      throw new Error(
        `You should provide GraphQLObjectTypeConfig or string with type name to ObjectTypeComposer.create(opts). Provided:\n${inspect(
          typeDef
        )}`
      );
    }

    return TC;
  }

  constructor(graphqlType: GraphQLObjectType, schemaComposer: SchemaComposer<TContext>) {
    if (!(schemaComposer instanceof SchemaComposer)) {
      throw new Error(
        'You must provide SchemaComposer instance as a second argument for `new ObjectTypeComposer(GraphQLObjectType, SchemaComposer)`'
      );
    }
    if (!(graphqlType instanceof GraphQLObjectType)) {
      throw new Error('ObjectTypeComposer accept only GraphQLObjectType in constructor');
    }

    this.schemaComposer = schemaComposer;
    this._gqType = graphqlType;

    // add itself to TypeStorage on create
    // it avoids recursive type use errors
    this.schemaComposer.set(graphqlType, this);
    const typename = graphqlType.name;
    if (typename !== 'Query' && typename !== 'Mutation' && typename !== 'Subscription') {
      this.schemaComposer.set(typename, this);
    }

    if (graphqlVersion >= 14) {
      this._gqcFields = convertObjectFieldMapToConfig(
        (this._gqType as any)._fields,
        this.schemaComposer
      );
      this._gqcInterfaces = convertInterfaceArrayAsThunk(
        (this._gqType as any)._interfaces,
        this.schemaComposer
      );
    } else {
      const fields: Thunk<GraphQLFieldConfigMap<any, TContext>> = (this._gqType as any)._typeConfig
        .fields;
      this._gqcFields = this.schemaComposer.typeMapper.convertOutputFieldConfigMap(
        (resolveMaybeThunk(fields) || {}) as any,
        this.getTypeName()
      );
      this._gqcInterfaces = convertInterfaceArrayAsThunk(
        (this._gqType as any)._interfaces || (this._gqType as any)._typeConfig.interfaces,
        this.schemaComposer
      );
    }

    if (graphqlType?.astNode?.directives) {
      this.setExtension(
        'directives',
        this.schemaComposer.typeMapper.parseDirectives(graphqlType?.astNode?.directives)
      );
    }
  }

  // -----------------------------------------------
  // Field methods
  // -----------------------------------------------

  getFields(): ObjectTypeComposerFieldConfigMap<TSource, TContext> {
    return this._gqcFields;
  }

  getFieldNames(): string[] {
    return Object.keys(this._gqcFields);
  }

  getField<TArgs = any>(
    fieldName: string
  ): ObjectTypeComposerFieldConfig<TSource, TContext, TArgs> {
    // If FieldConfig is a Thunk then unwrap it on first read.
    // In most cases FieldConfig is an object,
    // but for solving hoisting problems it's quite good to wrap it in function.
    if (isFunction(this._gqcFields[fieldName])) {
      const unwrappedFieldConfig = (this._gqcFields as any)[fieldName](this.schemaComposer);
      this.setField(fieldName, unwrappedFieldConfig);
    }

    const field = this._gqcFields[fieldName];
    if (!field) {
      throw new Error(
        `Cannot get field '${fieldName}' from type '${this.getTypeName()}'. Field does not exist.`
      );
    }
    return field;
  }

  hasField(fieldName: string): boolean {
    return !!this._gqcFields[fieldName];
  }

  setFields(fields: ObjectTypeComposerFieldConfigMapDefinition<TSource, TContext>): this {
    this._gqcFields = {};
    Object.keys(fields).forEach((name) => {
      this.setField(name, fields[name]);
    });
    return this;
  }

  setField<TArgs = any>(
    fieldName: string,
    fieldConfig: ObjectTypeComposerFieldConfigDefinition<TSource, TContext, TArgs>
  ): this {
    this._gqcFields[fieldName] = isFunction(fieldConfig)
      ? (fieldConfig as any)
      : this.schemaComposer.typeMapper.convertOutputFieldConfig(
          fieldConfig,
          fieldName,
          this.getTypeName()
        );
    return this;
  }

  /**
   * Add new fields or replace existed in a GraphQL type
   */
  addFields(newFields: ObjectTypeComposerFieldConfigMapDefinition<TSource, TContext>): this {
    Object.keys(newFields).forEach((name) => {
      this.setField(name, newFields[name]);
    });
    return this;
  }

  /**
   * Add new fields or replace existed (where field name may have dots)
   */
  addNestedFields(newFields: ObjectTypeComposerFieldConfigMapDefinition<TSource, TContext>): this {
    Object.keys(newFields).forEach((fieldName) => {
      const fc = newFields[fieldName];
      const names = fieldName.split('.');
      const name = names.shift();

      if (!name) {
        throw new Error(`Type ${this.getTypeName()} has invalid field name: ${fieldName}`);
      }

      if (names.length === 0) {
        // single field
        this.setField(name, fc);
      } else {
        // nested field
        let childTC;
        if (!this.hasField(name)) {
          childTC = ObjectTypeComposer.create(
            `${this.getTypeName()}${upperFirst(name)}`,
            this.schemaComposer
          );
          this.setField(name, {
            type: childTC,
            resolve: () => ({}),
          });
        } else {
          childTC = this.getFieldTC(name);
        }
        if (childTC instanceof ObjectTypeComposer) {
          childTC.addNestedFields({ [names.join('.')]: fc });
        }
      }
    });

    return this;
  }

  /**
   * Remove fields from type by name or array of names.
   * You also may pass name in dot-notation, in such case will be removed nested field.
   *
   * @example
   *     removeField('field1'); // remove 1 field
   *     removeField(['field1', 'field2']); // remove 2 fields
   *     removeField('field1.subField1'); // remove 1 nested field
   */
  removeField(fieldNameOrArray: string | string[]): this {
    const fieldNames = Array.isArray(fieldNameOrArray) ? fieldNameOrArray : [fieldNameOrArray];
    fieldNames.forEach((fieldName) => {
      const names = fieldName.split('.');
      const name = names.shift();

      if (!name) return;

      if (names.length === 0) {
        // single field
        delete this._gqcFields[name];
      } else {
        // nested field
        // eslint-disable-next-line no-lonely-if
        if (this.hasField(name)) {
          const subTC = this.getFieldTC(name);
          if (subTC instanceof ObjectTypeComposer || subTC instanceof EnumTypeComposer) {
            subTC.removeField(names.join('.'));
          }
        }
      }
    });
    return this;
  }

  removeOtherFields(fieldNameOrArray: string | string[]): this {
    const keepFieldNames = Array.isArray(fieldNameOrArray) ? fieldNameOrArray : [fieldNameOrArray];
    Object.keys(this._gqcFields).forEach((fieldName) => {
      if (keepFieldNames.indexOf(fieldName) === -1) {
        delete this._gqcFields[fieldName];
      }
    });
    return this;
  }

  reorderFields(names: string[]): this {
    const orderedFields = {} as ObjectTypeComposerFieldConfig<TSource, TContext>;
    const fields = this._gqcFields;
    names.forEach((name) => {
      if (fields[name]) {
        orderedFields[name] = fields[name];
        delete fields[name];
      }
    });
    this._gqcFields = { ...orderedFields, ...fields };
    return this;
  }

  extendField<TArgs = any>(
    fieldName: string,
    partialFieldConfig: Partial<
      ObjectTypeComposerFieldConfigAsObjectDefinition<TSource, TContext, TArgs>
    >
  ): this {
    let prevFieldConfig;
    try {
      prevFieldConfig = this.getField(fieldName);
    } catch (e) {
      throw new Error(
        `Cannot extend field '${fieldName}' from type '${this.getTypeName()}'. Field does not exist.`
      );
    }

    this.setField(fieldName, {
      ...prevFieldConfig,
      ...(partialFieldConfig as any),
      extensions: {
        ...(prevFieldConfig.extensions || {}),
        ...(partialFieldConfig.extensions || {}),
      },
    });
    return this;
  }

  getFieldConfig(fieldName: string): GraphQLFieldConfig<TSource, TContext> {
    const { type, args, ...rest } = this.getField(fieldName);
    return {
      type: type.getType(),
      args:
        args &&
        mapEachKey(args, (ac) => ({
          ...ac,
          type: ac.type.getType(),
        })),
      ...rest,
    };
  }

  getFieldType(fieldName: string): GraphQLOutputType {
    return this.getField(fieldName).type.getType();
  }

  getFieldTypeName(fieldName: string): string {
    return this.getField(fieldName).type.getTypeName();
  }

  /**
   * Automatically unwrap from List, NonNull, ThunkComposer
   * It's important! Cause greatly helps to modify fields types in a real code
   * without manual unwrap writing.
   *
   * If you need to work with wrappers, you may use the following code:
   *   - `TC.getField().type` // returns real wrapped TypeComposer
   *   - `TC.isFieldNonNull()` // checks is field NonNull or not
   *   - `TC.makeFieldNonNull()` // for wrapping in NonNullComposer
   *   - `TC.makeFieldNullable()` // for unwrapping from NonNullComposer
   *   - `TC.isFieldPlural()` // checks is field wrapped in ListComposer or not
   *   - `TC.makeFieldPlural()` // for wrapping in ListComposer
   *   - `TC.makeFieldNonPlural()` // for unwrapping from ListComposer
   */
  getFieldTC(fieldName: string): ComposeNamedOutputType<TContext> {
    const anyTC = this.getField(fieldName).type;
    return unwrapOutputTC(anyTC);
  }

  /**
   * Alias for `getFieldTC()` but returns statically checked ObjectTypeComposer.
   * If field have other type then error will be thrown.
   */
  getFieldOTC(fieldName: string): ObjectTypeComposer<TSource, TContext> {
    const tc = this.getFieldTC(fieldName);
    if (!(tc instanceof ObjectTypeComposer)) {
      throw new Error(
        `${this.getTypeName()}.getFieldOTC('${fieldName}') must be ObjectTypeComposer, but received ${
          tc.constructor.name
        }. Maybe you need to use 'getFieldTC()' method which returns any type composer?`
      );
    }
    return tc;
  }

  isFieldNonNull(fieldName: string): boolean {
    return this.getField(fieldName).type instanceof NonNullComposer;
  }

  makeFieldNonNull(fieldNameOrArray: string | string[]): this {
    const fieldNames = Array.isArray(fieldNameOrArray) ? fieldNameOrArray : [fieldNameOrArray];
    fieldNames.forEach((fieldName) => {
      const fc = this._gqcFields[fieldName];
      if (fc && !(fc.type instanceof NonNullComposer)) {
        fc.type = new NonNullComposer(fc.type);
      }
    });
    return this;
  }

  makeFieldNullable(fieldNameOrArray: string | string[]): this {
    const fieldNames = Array.isArray(fieldNameOrArray) ? fieldNameOrArray : [fieldNameOrArray];
    fieldNames.forEach((fieldName) => {
      const fc = this._gqcFields[fieldName];
      if (fc && fc.type instanceof NonNullComposer) {
        fc.type = fc.type.ofType;
      }
    });
    return this;
  }

  isFieldPlural(fieldName: string): boolean {
    const type = this.getField(fieldName).type;
    return (
      type instanceof ListComposer ||
      (type instanceof NonNullComposer && type.ofType instanceof ListComposer)
    );
  }

  makeFieldPlural(fieldNameOrArray: string | string[]): this {
    const fieldNames = Array.isArray(fieldNameOrArray) ? fieldNameOrArray : [fieldNameOrArray];
    fieldNames.forEach((fieldName) => {
      const fc = this._gqcFields[fieldName];
      if (fc && !(fc.type instanceof ListComposer)) {
        fc.type = new ListComposer(fc.type);
      }
    });
    return this;
  }

  makeFieldNonPlural(fieldNameOrArray: string | string[]): this {
    const fieldNames = Array.isArray(fieldNameOrArray) ? fieldNameOrArray : [fieldNameOrArray];
    fieldNames.forEach((fieldName) => {
      const fc = this._gqcFields[fieldName];
      if (fc) {
        if (fc.type instanceof ListComposer) {
          fc.type = fc.type.ofType;
        } else if (fc.type instanceof NonNullComposer && fc.type.ofType instanceof ListComposer) {
          fc.type =
            fc.type.ofType.ofType instanceof NonNullComposer
              ? fc.type.ofType.ofType
              : new NonNullComposer(fc.type.ofType.ofType);
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
          `Cannot deprecate non-existent field '${fields}' from type '${this.getTypeName()}'`
        );
      }
      this.extendField(fields, { deprecationReason: 'deprecated' });
    } else if (Array.isArray(fields)) {
      fields.forEach((field) => {
        if (existedFieldNames.indexOf(field) === -1) {
          throw new Error(
            `Cannot deprecate non-existent field '${field}' from type '${this.getTypeName()}'`
          );
        }
        this.extendField(field, { deprecationReason: 'deprecated' });
      });
    } else {
      const fieldMap = fields;
      Object.keys(fieldMap).forEach((field) => {
        if (existedFieldNames.indexOf(field) === -1) {
          throw new Error(
            `Cannot deprecate non-existent field '${field}' from type '${this.getTypeName()}'`
          );
        }
        const deprecationReason: string = fieldMap[field];
        this.extendField(field, { deprecationReason });
      });
    }

    return this;
  }

  // -----------------------------------------------
  // Field Args methods
  // -----------------------------------------------

  getFieldArgs<TArgs = any>(fieldName: string): ObjectTypeComposerArgumentConfigMap<TArgs> {
    try {
      const fc = this.getField(fieldName);
      return fc.args || {};
    } catch (e) {
      throw new Error(
        `Cannot get args from '${this.getTypeName()}.${fieldName}'. Field does not exist.`
      );
    }
  }

  getFieldArgNames(fieldName: string): string[] {
    return Object.keys(this.getFieldArgs(fieldName));
  }

  hasFieldArg(fieldName: string, argName: string): boolean {
    try {
      const fieldArgs = this.getFieldArgs(fieldName);
      return !!fieldArgs[argName];
    } catch (e) {
      return false;
    }
  }

  getFieldArg(fieldName: string, argName: string): ObjectTypeComposerArgumentConfig {
    const fieldArgs = this.getFieldArgs(fieldName);
    const arg = fieldArgs[argName];
    if (!arg) {
      throw new Error(
        `Cannot get '${this.getTypeName()}.${fieldName}@${argName}'. Argument does not exist.`
      );
    }
    return arg;
  }

  getFieldArgType(fieldName: string, argName: string): GraphQLInputType {
    const ac = this.getFieldArg(fieldName, argName);
    return ac.type.getType();
  }

  getFieldArgTypeName(fieldName: string, argName: string): string {
    const ac = this.getFieldArg(fieldName, argName);
    return ac.type.getTypeName();
  }

  /**
   * Automatically unwrap from List, NonNull, ThunkComposer
   * It's important! Cause greatly helps to modify args types in a real code
   * without manual unwrap writing.
   *
   * If you need to work with wrappers, you may use the following code:
   *    `isFieldArgPlural()` – checks is arg wrapped in ListComposer or not
   *    `makeFieldArgPlural()` – for arg wrapping in ListComposer
   *    `makeFieldArgNonPlural()` – for arg unwrapping from ListComposer
   *    `isFieldArgNonNull()` – checks is arg wrapped in NonNullComposer or not
   *    `makeFieldArgNonNull()` – for arg wrapping in NonNullComposer
   *    `makeFieldArgNullable()` – for arg unwrapping from NonNullComposer
   */
  getFieldArgTC(fieldName: string, argName: string): ComposeNamedInputType<TContext> {
    const anyTC = this.getFieldArg(fieldName, argName).type;

    // Unwrap from List, NonNull and ThunkComposer
    return unwrapInputTC(anyTC);
  }

  /**
   * Alias for `getFieldArgTC()` but returns statically checked InputTypeComposer.
   * If field have other type then error will be thrown.
   */
  getFieldArgITC(fieldName: string, argName: string): InputTypeComposer<TContext> {
    const tc = this.getFieldArgTC(fieldName, argName);
    if (!(tc instanceof InputTypeComposer)) {
      throw new Error(
        `${this.getTypeName()}.getFieldArgITC('${fieldName}', '${argName}') must be InputTypeComposer, but received ${
          tc.constructor.name
        }. Maybe you need to use 'getFieldArgTC()' method which returns any type composer?`
      );
    }
    return tc;
  }

  setFieldArgs(fieldName: string, args: ObjectTypeComposerArgumentConfigMapDefinition<any>): this {
    const fc = this.getField(fieldName);
    fc.args = this.schemaComposer.typeMapper.convertArgConfigMap(
      args,
      fieldName,
      this.getTypeName()
    );
    return this;
  }

  addFieldArgs(
    fieldName: string,
    newArgs: ObjectTypeComposerArgumentConfigMapDefinition<any>
  ): this {
    const fc = this.getField(fieldName);
    fc.args = {
      ...fc.args,
      ...this.schemaComposer.typeMapper.convertArgConfigMap(newArgs, fieldName, this.getTypeName()),
    };
    return this;
  }

  setFieldArg(
    fieldName: string,
    argName: string,
    argConfig: ObjectTypeComposerArgumentConfigDefinition
  ): this {
    const fc = this.getField(fieldName);
    fc.args = fc.args || {};
    fc.args[argName] = this.schemaComposer.typeMapper.convertArgConfig(
      argConfig,
      argName,
      fieldName,
      this.getTypeName()
    );
    return this;
  }

  removeFieldArg(fieldName: string, argNameOrArray: string | string[]): this {
    const argNames = Array.isArray(argNameOrArray) ? argNameOrArray : [argNameOrArray];
    const args = this._gqcFields[fieldName] && this._gqcFields[fieldName].args;
    if (args) {
      argNames.forEach((argName) => delete args[argName]);
    }
    return this;
  }

  removeFieldOtherArgs(fieldName: string, argNameOrArray: string | string[]): this {
    const keepArgNames = Array.isArray(argNameOrArray) ? argNameOrArray : [argNameOrArray];
    const args = this._gqcFields[fieldName] && this._gqcFields[fieldName].args;
    if (args) {
      Object.keys(args).forEach((argName) => {
        if (keepArgNames.indexOf(argName) === -1) {
          delete args[argName];
        }
      });
    }
    return this;
  }

  isFieldArgPlural(fieldName: string, argName: string): boolean {
    const type = this.getFieldArg(fieldName, argName).type;
    return (
      type instanceof ListComposer ||
      (type instanceof NonNullComposer && type.ofType instanceof ListComposer)
    );
  }

  makeFieldArgPlural(fieldName: string, argNameOrArray: string | string[]): this {
    const args = this.getField(fieldName).args;
    if (!args) return this;
    const argNames = Array.isArray(argNameOrArray) ? argNameOrArray : [argNameOrArray];
    argNames.forEach((argName) => {
      const ac = args[argName];
      if (ac && !(ac.type instanceof ListComposer)) {
        ac.type = new ListComposer(ac.type);
      }
    });
    return this;
  }

  makeFieldArgNonPlural(fieldName: string, argNameOrArray: string | string[]): this {
    const args = this.getField(fieldName).args;
    if (!args) return this;
    const argNames = Array.isArray(argNameOrArray) ? argNameOrArray : [argNameOrArray];
    argNames.forEach((argName) => {
      const ac = args[argName];
      if (ac) {
        if (ac.type instanceof ListComposer) {
          ac.type = ac.type.ofType;
        } else if (ac.type instanceof NonNullComposer && ac.type.ofType instanceof ListComposer) {
          ac.type =
            ac.type.ofType.ofType instanceof NonNullComposer
              ? ac.type.ofType.ofType
              : new NonNullComposer(ac.type.ofType.ofType);
        }
      }
    });
    return this;
  }

  isFieldArgNonNull(fieldName: string, argName: string): boolean {
    const type = this.getFieldArg(fieldName, argName).type;
    return type instanceof NonNullComposer;
  }

  makeFieldArgNonNull(fieldName: string, argNameOrArray: string | string[]): this {
    const args = this.getField(fieldName).args;
    if (!args) return this;
    const argNames = Array.isArray(argNameOrArray) ? argNameOrArray : [argNameOrArray];
    argNames.forEach((argName) => {
      const ac = args[argName];
      if (ac && !(ac.type instanceof NonNullComposer)) {
        ac.type = new NonNullComposer(ac.type);
      }
    });
    return this;
  }

  makeFieldArgNullable(fieldName: string, argNameOrArray: string | string[]): this {
    const args = this.getField(fieldName).args;
    if (!args) return this;
    const argNames = Array.isArray(argNameOrArray) ? argNameOrArray : [argNameOrArray];
    argNames.forEach((argName) => {
      const ac = args[argName];
      if (ac && ac.type instanceof NonNullComposer) {
        ac.type = ac.type.ofType;
      }
    });
    return this;
  }

  // -----------------------------------------------
  // Type methods
  // -----------------------------------------------

  getType(): GraphQLObjectType {
    this._gqType.astNode = getObjectTypeDefinitionNode(this);
    if (graphqlVersion >= 14) {
      (this._gqType as any)._fields = () =>
        defineFieldMap(
          this._gqType,
          mapEachKey(this._gqcFields, (_, name) => this.getFieldConfig(name)),
          this._gqType.astNode
        );
      (this._gqType as any)._interfaces = () => this.getInterfacesTypes();
    } else {
      (this._gqType as any)._typeConfig.fields = () => {
        return mapEachKey(this._gqcFields, (_, name) => this.getFieldConfig(name));
      };
      (this._gqType as any)._typeConfig.interfaces = () => this.getInterfacesTypes();
      delete (this._gqType as any)._fields; // clear builded fields in type
      delete (this._gqType as any)._interfaces;
    }
    return this._gqType;
  }

  getTypePlural(): ListComposer<ObjectTypeComposer<TSource, TContext>> {
    return new ListComposer(this);
  }

  getTypeNonNull(): NonNullComposer<ObjectTypeComposer<TSource, TContext>> {
    return new NonNullComposer(this);
  }

  /**
   * Get Type wrapped in List modifier
   *
   * @example
   *   const UserTC = schemaComposer.createObjectTC(`type User { name: String }`);
   *   schemaComposer.Query.addFields({
   *     users1: { type: UserTC.List }, // in SDL: users1: [User]
   *     users2: { type: UserTC.NonNull.List }, // in SDL: users2: [User!]
   *     users3: { type: UserTC.NonNull.List.NonNull }, // in SDL: users2: [User!]!
   *   })
   */
  get List(): ListComposer<ObjectTypeComposer<TSource, TContext>> {
    return new ListComposer(this);
  }

  /**
   * Get Type wrapped in NonNull modifier
   *
   * @example
   *   const UserTC = schemaComposer.createObjectTC(`type User { name: String }`);
   *   schemaComposer.Query.addFields({
   *     users1: { type: UserTC.List }, // in SDL: users1: [User]
   *     users2: { type: UserTC.NonNull.List }, // in SDL: users2: [User!]!
   *     users3: { type: UserTC.NonNull.List.NonNull }, // in SDL: users2: [User!]!
   *   })
   */
  get NonNull(): NonNullComposer<ObjectTypeComposer<TSource, TContext>> {
    return new NonNullComposer(this);
  }

  getTypeName(): string {
    return this._gqType.name;
  }

  setTypeName(name: string): this {
    this._gqType.name = name;
    this.schemaComposer.add(this);
    return this;
  }

  getDescription(): string {
    return this._gqType.description || '';
  }

  setDescription(description: string): this {
    this._gqType.description = description;
    return this;
  }

  /**
   * You may clone this type with a new provided name as string.
   * Or you may provide a new TypeComposer which will get all cloned
   * settings from this type.
   */
  clone(
    newTypeNameOrTC: string | ObjectTypeComposer<any, any>
  ): ObjectTypeComposer<TSource, TContext> {
    if (!newTypeNameOrTC) {
      throw new Error('You should provide newTypeName:string for ObjectTypeComposer.clone()');
    }

    const cloned =
      newTypeNameOrTC instanceof ObjectTypeComposer
        ? newTypeNameOrTC
        : ObjectTypeComposer.create(newTypeNameOrTC, this.schemaComposer);

    cloned._gqcFields = mapEachKey(this._gqcFields, (fieldConfig) => ({
      ...fieldConfig,
      args: mapEachKey(fieldConfig.args || {}, (argConfig) => ({
        ...argConfig,
        extensions: { ...argConfig.extensions },
      })),
      extensions: { ...fieldConfig.extensions },
    }));
    cloned._gqcInterfaces = [...this._gqcInterfaces];
    cloned._gqcExtensions = { ...this._gqcExtensions };
    cloned._gqcGetRecordIdFn = this._gqcGetRecordIdFn;
    cloned.setDescription(this.getDescription());

    this.getResolvers().forEach((resolver) => {
      const newResolver = resolver.clone();
      // in cloned resolvers we also replace cloned ObjectTypeComposer
      newResolver.type = replaceTC(newResolver.type, (tc) => {
        return tc === this ? cloned : tc;
      });
      cloned.addResolver(newResolver);
    });

    return cloned;
  }

  /**
   * Clone this type to another SchemaComposer.
   * Also will be cloned all sub-types.
   */
  cloneTo(
    anotherSchemaComposer: SchemaComposer<any>,
    cloneMap: Map<any, any> = new Map()
  ): ObjectTypeComposer<any, any> {
    if (!anotherSchemaComposer) {
      throw new Error('You should provide SchemaComposer for ObjectTypeComposer.cloneTo()');
    }

    if (cloneMap.has(this)) return cloneMap.get(this);
    const cloned = ObjectTypeComposer.create(this.getTypeName(), anotherSchemaComposer);
    cloneMap.set(this, cloned);

    cloned._gqcFields = mapEachKey(this._gqcFields, (fieldConfig) => ({
      ...fieldConfig,
      type: cloneTypeTo(fieldConfig.type, anotherSchemaComposer, cloneMap),
      args: mapEachKey(fieldConfig.args, (argConfig) => ({
        ...argConfig,
        type: cloneTypeTo(argConfig.type, anotherSchemaComposer, cloneMap),
        extensions: { ...argConfig.extensions },
      })),
      extensions: { ...fieldConfig.extensions },
    })) as any;

    cloned._gqcInterfaces = this._gqcInterfaces.map((i) =>
      i.cloneTo(anotherSchemaComposer, cloneMap)
    ) as any;
    cloned._gqcExtensions = { ...this._gqcExtensions };
    cloned._gqcGetRecordIdFn = this._gqcGetRecordIdFn;
    cloned.setDescription(this.getDescription());

    this.getResolvers().forEach((resolver) => {
      const clonedResolver = resolver.cloneTo(anotherSchemaComposer, cloneMap);
      cloned.addResolver(clonedResolver);
    });

    return cloned;
  }

  getIsTypeOf(): GraphQLIsTypeOfFn<TSource, TContext> | undefined | null {
    return this._gqType.isTypeOf;
  }

  setIsTypeOf(fn: GraphQLIsTypeOfFn<any, any> | null | undefined): this {
    this._gqType.isTypeOf = fn;
    return this;
  }

  /**
   * Merge fields and interfaces from provided `GraphQLObjectType`, or `ObjectTypeComposer`.
   * Also you may provide `GraphQLInterfaceType` or `InterfaceTypeComposer` for adding fields.
   */
  merge(
    type:
      | GraphQLObjectType
      | GraphQLInterfaceType
      | ObjectTypeComposer<any, any>
      | InterfaceTypeComposer<any, any>
  ): this {
    let tc: ObjectTypeComposer | InterfaceTypeComposer;
    if (type instanceof ObjectTypeComposer || type instanceof InterfaceTypeComposer) {
      tc = type;
    } else if (type instanceof GraphQLObjectType) {
      tc = ObjectTypeComposer.createTemp(type, this.schemaComposer);
    } else if (type instanceof GraphQLInterfaceType) {
      tc = InterfaceTypeComposer.createTemp(type, this.schemaComposer);
    } else {
      throw new Error(
        `Cannot merge ${inspect(
          type
        )} with ObjectType(${this.getTypeName()}). Provided type should be GraphQLInterfaceType, GraphQLObjectType, InterfaceTypeComposer or ObjectTypeComposer.`
      );
    }

    // deep clone all fields with args
    const fields = { ...tc.getFields() } as ObjectTypeComposerFieldConfigMapDefinition<any, any>;
    Object.keys(fields).forEach((fieldName) => {
      fields[fieldName] = {
        ...(fields as any)[fieldName],
        args: {
          ...(fields as any)[fieldName].args,
        },
        // set type as SDL string, it automatically will be remapped to the correct type instance in the current schema
        type: tc.getFieldTypeName(fieldName),
      };
      tc.getFieldArgNames(fieldName).forEach((argName) => {
        (fields as any)[fieldName].args[argName] = {
          ...(fields as any)[fieldName].args[argName],
          // set type as SDL string, it automatically will be remapped to the correct type instance in the current schema
          type: tc.getFieldArgTypeName(fieldName, argName),
        };
      });
    });
    this.addFields(fields);

    // set interfaces as SDL string, it automatically will be remapped to the correct type instance in the current schema
    this.addInterfaces(tc.getInterfaces().map((i) => i.getTypeName()));

    // Feel free to add other properties for merging two TypeComposers.
    // For simplicity it just merge fields and interfaces.

    return this;
  }

  // -----------------------------------------------
  // InputType methods
  // -----------------------------------------------

  getInputType(): GraphQLInputObjectType {
    return this.getInputTypeComposer().getType();
  }

  hasInputTypeComposer(): boolean {
    return !!this._gqcInputTypeComposer;
  }

  setInputTypeComposer(itc: InputTypeComposer<TContext>): this {
    this._gqcInputTypeComposer = itc;
    return this;
  }

  getInputTypeComposer(opts?: ToInputTypeOpts): InputTypeComposer<TContext> {
    if (!this._gqcInputTypeComposer) {
      this._gqcInputTypeComposer = toInputObjectType(this, opts);
    }

    return this._gqcInputTypeComposer;
  }

  // Alias for getInputTypeComposer()
  getITC(opts?: ToInputTypeOpts): InputTypeComposer<TContext> {
    return this.getInputTypeComposer(opts);
  }

  removeInputTypeComposer(): this {
    this._gqcInputTypeComposer = undefined;
    return this;
  }

  // -----------------------------------------------
  // Resolver methods
  // -----------------------------------------------

  getResolvers(): Map<string, Resolver<any, TContext, any>> {
    if (!this._gqcResolvers) {
      this._gqcResolvers = new Map();
    }
    return this._gqcResolvers;
  }

  /**
   * Returns existed Resolver by name.
   *
   * Resolver may be additionally wrapped by middlewares. Eg:
   *
   * @example
   *     async function authMiddleware(resolve, source, args, context, info) {
   *       if (somehowCheckAuthInContext(context)) {
   *         return resolve(source, args, context, info);
   *       }
   *       throw new Error('You must be authorized');
   *     }
   *
   *     schemaComposer.Query.addFields({
   *       userById: UserTC.getResolver('findById', [authMiddleware]),
   *       userByIds: UserTC.getResolver('findByIds', [authMiddleware]),
   *     });
   *
   * @param name
   * @param middlewares type ResolverMiddleware = (resolve, source, args, context, info) => any;
   */
  hasResolver(name: string): boolean {
    if (!this._gqcResolvers) {
      return false;
    }
    return this._gqcResolvers.has(name);
  }

  getResolver<TArgs = any>(
    name: string,
    middlewares?: Array<ResolverMiddleware<TSource, TContext, TArgs>>
  ): Resolver<any, TContext, TArgs> {
    if (!this.hasResolver(name)) {
      throw new Error(`Type ${this.getTypeName()} does not have resolver with name '${name}'`);
    }
    const resolverMap: any = this._gqcResolvers;
    const resolver = resolverMap.get(name);

    if (Array.isArray(middlewares)) {
      return resolver.withMiddlewares(middlewares);
    }

    return resolver;
  }

  setResolver(name: string, resolver: Resolver<any, TContext>): this {
    if (!this._gqcResolvers) {
      this._gqcResolvers = new Map();
    }
    if (!(resolver instanceof Resolver)) {
      throw new Error('setResolver() accept only Resolver instance');
    }
    this._gqcResolvers.set(name, resolver);
    resolver.setDisplayName(`${this.getTypeName()}.${resolver.name}`);
    return this;
  }

  addResolver(opts: Resolver<any, TContext> | ResolverDefinition<any, TContext>): this {
    if (!opts) {
      throw new Error('addResolver called with empty Resolver');
    }

    let resolver: Resolver<any, TContext, any>;
    if (!(opts instanceof Resolver)) {
      const resolverOpts = { ...opts };
      // add resolve method, otherwise added resolver will not return any data by graphql-js
      if (!resolverOpts.hasOwnProperty('resolve')) {
        resolverOpts.resolve = () => ({});
      }
      resolver = new Resolver(
        resolverOpts as ResolverDefinition<any, TContext, any>,
        this.schemaComposer
      );
    } else {
      resolver = opts;
    }

    if (!resolver.name) {
      throw new Error('resolver should have non-empty `name` property');
    }
    this.setResolver(resolver.name, resolver);
    return this;
  }

  removeResolver(resolverName: string): this {
    if (resolverName) {
      this.getResolvers().delete(resolverName);
    }
    return this;
  }

  wrapResolver(resolverName: string, cbResolver: ResolverWrapCb<any, TSource, TContext>): this {
    const resolver = this.getResolver(resolverName);
    const newResolver = resolver.wrap(cbResolver);
    this.setResolver(resolverName, newResolver);
    return this;
  }

  wrapResolverAs(
    resolverName: string,
    fromResolverName: string,
    cbResolver: ResolverWrapCb<any, TSource, TContext>
  ): this {
    const resolver = this.getResolver(fromResolverName);
    const newResolver = resolver.wrap(cbResolver);
    this.setResolver(resolverName, newResolver);
    return this;
  }

  wrapResolverResolve(resolverName: string, cbNextRp: ResolverNextRpCb<any, TContext>): this {
    const resolver = this.getResolver(resolverName);
    this.setResolver(resolverName, resolver.wrapResolve(cbNextRp));
    return this;
  }

  // -----------------------------------------------
  // Interface methods
  // -----------------------------------------------

  getInterfaces(): Array<InterfaceTypeComposerThunked<TSource, TContext>> {
    return this._gqcInterfaces;
  }

  getInterfacesTypes(): Array<GraphQLInterfaceType> {
    return this._gqcInterfaces.map((i) => i.getType());
  }

  setInterfaces(interfaces: ReadonlyArray<InterfaceTypeComposerDefinition<any, TContext>>): this {
    this._gqcInterfaces = convertInterfaceArrayAsThunk(interfaces, this.schemaComposer);
    return this;
  }

  hasInterface(iface: InterfaceTypeComposerDefinition<any, TContext>): boolean {
    const typeName = getComposeTypeName(iface, this.schemaComposer);
    return !!this._gqcInterfaces.find((i) => i.getTypeName() === typeName);
  }

  addInterface(
    iface:
      | InterfaceTypeComposerDefinition<any, TContext>
      | InterfaceTypeComposerThunked<any, TContext>
  ): this {
    if (!this.hasInterface(iface)) {
      this._gqcInterfaces.push(
        this.schemaComposer.typeMapper.convertInterfaceTypeDefinition(iface)
      );
    }
    return this;
  }

  addInterfaces(
    ifaces: ReadonlyArray<
      InterfaceTypeComposerDefinition<any, TContext> | InterfaceTypeComposerThunked<any, TContext>
    >
  ): this {
    if (!Array.isArray(ifaces)) {
      throw new Error(
        `ObjectTypeComposer[${this.getTypeName()}].addInterfaces() accepts only array`
      );
    }
    ifaces.forEach((iface) => this.addInterface(iface));
    return this;
  }

  removeInterface(iface: InterfaceTypeComposerDefinition<any, TContext>): this {
    const typeName = getComposeTypeName(iface, this.schemaComposer);
    this._gqcInterfaces = this._gqcInterfaces.filter((i) => i.getTypeName() !== typeName);
    return this;
  }

  // -----------------------------------------------
  // Extensions methods
  // -----------------------------------------------

  getExtensions(): Extensions {
    if (!this._gqcExtensions) {
      return {};
    } else {
      return this._gqcExtensions;
    }
  }

  setExtensions(extensions: Extensions): this {
    this._gqcExtensions = extensions;
    return this;
  }

  extendExtensions(extensions: Extensions): this {
    const current = this.getExtensions();
    this.setExtensions({
      ...current,
      ...extensions,
    });
    return this;
  }

  clearExtensions(): this {
    this.setExtensions({});
    return this;
  }

  getExtension(extensionName: string): unknown {
    const extensions = this.getExtensions();
    return extensions[extensionName];
  }

  hasExtension(extensionName: string): boolean {
    const extensions = this.getExtensions();
    return extensionName in extensions;
  }

  setExtension(extensionName: string, value: unknown): this {
    this.extendExtensions({
      [extensionName]: value,
    });
    return this;
  }

  removeExtension(extensionName: string): this {
    const extensions = { ...this.getExtensions() };
    delete extensions[extensionName];
    this.setExtensions(extensions);
    return this;
  }

  getFieldExtensions(fieldName: string): Extensions {
    const field = this.getField(fieldName);
    return field.extensions || {};
  }

  setFieldExtensions(fieldName: string, extensions: Extensions): this {
    const field = this.getField(fieldName);
    this.setField(fieldName, { ...field, extensions });
    return this;
  }

  extendFieldExtensions(fieldName: string, extensions: Extensions): this {
    const current = this.getFieldExtensions(fieldName);
    this.setFieldExtensions(fieldName, {
      ...current,
      ...extensions,
    });
    return this;
  }

  clearFieldExtensions(fieldName: string): this {
    this.setFieldExtensions(fieldName, {});
    return this;
  }

  getFieldExtension(fieldName: string, extensionName: string): unknown {
    const extensions = this.getFieldExtensions(fieldName);
    return extensions[extensionName];
  }

  hasFieldExtension(fieldName: string, extensionName: string): boolean {
    const extensions = this.getFieldExtensions(fieldName);
    return extensionName in extensions;
  }

  setFieldExtension(fieldName: string, extensionName: string, value: unknown): this {
    this.extendFieldExtensions(fieldName, {
      [extensionName]: value,
    });
    return this;
  }

  removeFieldExtension(fieldName: string, extensionName: string): this {
    const extensions = { ...this.getFieldExtensions(fieldName) };
    delete extensions[extensionName];
    this.setFieldExtensions(fieldName, extensions);
    return this;
  }

  getFieldArgExtensions(fieldName: string, argName: string): Extensions {
    const ac = this.getFieldArg(fieldName, argName);
    return ac.extensions || {};
  }

  setFieldArgExtensions(fieldName: string, argName: string, extensions: Extensions): this {
    const ac = this.getFieldArg(fieldName, argName);
    this.setFieldArg(fieldName, argName, { ...ac, extensions });
    return this;
  }

  extendFieldArgExtensions(fieldName: string, argName: string, extensions: Extensions): this {
    const current = this.getFieldArgExtensions(fieldName, argName);
    this.setFieldArgExtensions(fieldName, argName, {
      ...current,
      ...extensions,
    });
    return this;
  }

  clearFieldArgExtensions(fieldName: string, argName: string): this {
    this.setFieldArgExtensions(fieldName, argName, {});
    return this;
  }

  getFieldArgExtension(fieldName: string, argName: string, extensionName: string): unknown {
    const extensions = this.getFieldArgExtensions(fieldName, argName);
    return extensions[extensionName];
  }

  hasFieldArgExtension(fieldName: string, argName: string, extensionName: string): boolean {
    const extensions = this.getFieldArgExtensions(fieldName, argName);
    return extensionName in extensions;
  }

  setFieldArgExtension(
    fieldName: string,
    argName: string,
    extensionName: string,
    value: unknown
  ): this {
    this.extendFieldArgExtensions(fieldName, argName, {
      [extensionName]: value,
    });
    return this;
  }

  removeFieldArgExtension(fieldName: string, argName: string, extensionName: string): this {
    const extensions = { ...this.getFieldArgExtensions(fieldName, argName) };
    delete extensions[extensionName];
    this.setFieldArgExtensions(fieldName, argName, extensions);
    return this;
  }

  // -----------------------------------------------
  // Directive methods
  //
  // Directive methods are useful if you declare your schemas via SDL.
  // Users who actively use `graphql-tools` can open new abilities for writing
  // your own directive handlers.
  //
  // If you create your schemas via config objects, then probably you
  // no need in `directives`. Instead directives better to use `extensions`.
  // -----------------------------------------------

  getDirectives(): Array<ExtensionsDirective> {
    const directives = this.getExtension('directives');
    if (Array.isArray(directives)) {
      return directives;
    }
    return [];
  }

  setDirectives(directives: Array<ExtensionsDirective>): this {
    this.setExtension('directives', directives);
    return this;
  }

  getDirectiveNames(): string[] {
    return this.getDirectives().map((d) => d.name);
  }

  getDirectiveByName(directiveName: string): DirectiveArgs | undefined {
    const directive = this.getDirectives().find((d) => d.name === directiveName);
    if (!directive) return undefined;
    return directive.args;
  }

  getDirectiveById(idx: number): DirectiveArgs | undefined {
    const directive = this.getDirectives()[idx];
    if (!directive) return undefined;
    return directive.args;
  }

  getFieldDirectives(fieldName: string): Array<ExtensionsDirective> {
    const directives = this.getFieldExtension(fieldName, 'directives');
    if (Array.isArray(directives)) {
      return directives;
    }
    return [];
  }

  setFieldDirectives(fieldName: string, directives: Array<ExtensionsDirective>): this {
    this.setFieldExtension(fieldName, 'directives', directives);
    return this;
  }

  getFieldDirectiveNames(fieldName: string): string[] {
    return this.getFieldDirectives(fieldName).map((d) => d.name);
  }

  getFieldDirectiveByName(fieldName: string, directiveName: string): DirectiveArgs | undefined {
    const directive = this.getFieldDirectives(fieldName).find((d) => d.name === directiveName);
    if (!directive) return undefined;
    return directive.args;
  }

  getFieldDirectiveById(fieldName: string, idx: number): DirectiveArgs | undefined {
    const directive = this.getFieldDirectives(fieldName)[idx];
    if (!directive) return undefined;
    return directive.args;
  }

  getFieldArgDirectives(fieldName: string, argName: string): Array<ExtensionsDirective> {
    const directives = this.getFieldArgExtension(fieldName, argName, 'directives');
    if (Array.isArray(directives)) {
      return directives;
    }
    return [];
  }

  setFieldArgDirectives(
    fieldName: string,
    argName: string,
    directives: Array<ExtensionsDirective>
  ): this {
    this.setFieldArgExtension(fieldName, argName, 'directives', directives);
    return this;
  }

  getFieldArgDirectiveNames(fieldName: string, argName: string): string[] {
    return this.getFieldArgDirectives(fieldName, argName).map((d) => d.name);
  }

  getFieldArgDirectiveByName(
    fieldName: string,
    argName: string,
    directiveName: string
  ): DirectiveArgs | undefined {
    const directive = this.getFieldArgDirectives(fieldName, argName).find(
      (d) => d.name === directiveName
    );
    if (!directive) return undefined;
    return directive.args;
  }

  getFieldArgDirectiveById(
    fieldName: string,
    argName: string,
    idx: number
  ): DirectiveArgs | undefined {
    const directive = this.getFieldArgDirectives(fieldName, argName)[idx];
    if (!directive) return undefined;
    return directive.args;
  }

  // -----------------------------------------------
  // Misc methods
  // -----------------------------------------------

  addRelation<TArgs = any>(
    fieldName: string,
    opts: Readonly<ObjectTypeComposerRelationOpts<any, TSource, TContext, TArgs>>
  ): this {
    if (!this._gqcRelations) {
      this._gqcRelations = {};
    }
    this._gqcRelations[fieldName] = opts;

    if (opts.hasOwnProperty('resolver')) {
      if (isFunction(opts.resolver)) {
        this._gqcFields[fieldName] = createThunkedObjectProxy(() =>
          this._relationWithResolverToFC(opts as any, fieldName)
        );
      } else {
        this._gqcFields[fieldName] = this._relationWithResolverToFC(opts as any, fieldName);
      }
    } else if (opts.hasOwnProperty('type')) {
      const fc = opts as ObjectTypeComposerFieldConfigAsObjectDefinition<TSource, TContext, any>;
      this.setField(fieldName, fc);
    }

    return this;
  }

  getRelations(): ObjectTypeComposerRelationMap<any, TContext> {
    if (!this._gqcRelations) {
      this._gqcRelations = {};
    }
    return this._gqcRelations;
  }

  _relationWithResolverToFC(
    opts: ObjectTypeComposerRelationOptsWithResolver<any, TSource, TContext, any>,
    fieldName: string = ''
  ): ObjectTypeComposerFieldConfig<TSource, TContext, any> {
    const resolver = isFunction(opts.resolver) ? opts.resolver(this.schemaComposer) : opts.resolver;

    if (!(resolver instanceof Resolver)) {
      throw new Error(
        'You should provide correct Resolver object for relation ' +
          `${this.getTypeName()}.${fieldName}`
      );
    }
    if ((opts as any).type) {
      throw new Error(
        'You can not use `resolver` and `type` properties simultaneously for relation ' +
          `${this.getTypeName()}.${fieldName}`
      );
    }
    if ((opts as any).resolve) {
      throw new Error(
        'You can not use `resolver` and `resolve` properties simultaneously for relation ' +
          `${this.getTypeName()}.${fieldName}`
      );
    }

    const argsConfig = { ...resolver.args };
    const argsProto = {} as Record<string, any>;
    const argsRuntime: [string, ObjectTypeComposerRelationArgsMapperFn<TSource, TContext>][] = [];

    // remove args from config, if arg name provided in args
    //    if `argMapVal`
    //       is `undefined`, then keep arg field in config
    //       is `null`, then just remove arg field from config
    //       is `function`, then remove arg field and run it in resolve
    //       is any other value, then put it to args prototype for resolve
    const optsArgs = opts.prepareArgs || {};

    Object.keys(optsArgs).forEach((argName) => {
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

    const fieldConfig = resolver.getFieldConfig();
    const resolve = (source: any, args: any, context: any, info: any) => {
      const newArgs = { ...args, ...argsProto };
      argsRuntime.forEach(([argName, argFn]) => {
        newArgs[argName] = argFn(source, args, context, info);
      });

      const payload = fieldConfig.resolve
        ? fieldConfig.resolve(source, newArgs, context, info)
        : null;
      return catchErrors
        ? Promise.resolve(payload).catch((e) => {
            // eslint-disable-next-line
            console.log(`GQC ERROR: relation for ${this.getTypeName()}.${fieldName} throws error:`);
            console.log(e); // eslint-disable-line
            return null;
          })
        : payload;
    };

    return {
      type: resolver.type,
      description: opts.description || resolver.description,
      deprecationReason: opts.deprecationReason,
      args: argsConfig,
      resolve,
      projection: opts.projection,
      extensions: {
        ...resolver.extensions,
        ...opts.extensions,
      },
    };
  }

  setRecordIdFn(fn: ObjectTypeComposerGetRecordIdFn<TSource, TContext>): this {
    this._gqcGetRecordIdFn = fn;
    return this;
  }

  hasRecordIdFn(): boolean {
    return !!this._gqcGetRecordIdFn;
  }

  getRecordIdFn(): ObjectTypeComposerGetRecordIdFn<TSource, TContext> {
    if (!this._gqcGetRecordIdFn) {
      throw new Error(`Type ${this.getTypeName()} does not have RecordIdFn`);
    }
    return this._gqcGetRecordIdFn;
  }

  /**
   * Get function that returns record id, from provided object.
   */
  getRecordId(source: TSource, args?: Record<string, any>, context?: TContext): string | number {
    return this.getRecordIdFn()(source, args, context);
  }

  get(path: string | string[]): TypeInPath<TContext> | void {
    return typeByPath(this, path);
  }

  /**
   * Returns all types which are used inside the current type
   */
  getNestedTCs(
    opts: {
      exclude?: string[];
    } = {},
    passedTypes: Set<NamedTypeComposer<any>> = new Set()
  ): Set<NamedTypeComposer<any>> {
    const exclude = Array.isArray(opts.exclude) ? opts.exclude : [];
    this.getFieldNames().forEach((fieldName) => {
      const tc = this.getFieldTC(fieldName);
      if (!passedTypes.has(tc) && !exclude.includes(tc.getTypeName())) {
        passedTypes.add(tc);
        if (tc instanceof ObjectTypeComposer || tc instanceof UnionTypeComposer) {
          tc.getNestedTCs(opts, passedTypes);
        }
      }

      this.getFieldArgNames(fieldName).forEach((argName) => {
        const itc = this.getFieldArgTC(fieldName, argName);
        if (!passedTypes.has(itc) && !exclude.includes(itc.getTypeName())) {
          passedTypes.add(itc);
          if (itc instanceof InputTypeComposer) {
            itc.getNestedTCs(opts, passedTypes);
          }
        }
      });
    });

    this.getInterfaces().forEach((t) => {
      const iftc = t instanceof ThunkComposer ? t.ofType : t;
      if (!passedTypes.has(iftc) && !exclude.includes(iftc.getTypeName())) {
        passedTypes.add(iftc);
        iftc.getNestedTCs(opts, passedTypes);
      }
    });
    return passedTypes;
  }

  /**
   * Prints SDL for current type. Or print with all used types if `deep: true` option was provided.
   */
  toSDL(
    opts?: SchemaPrinterOptions & {
      deep?: boolean;
      exclude?: string[];
    }
  ): string {
    const { deep, ...innerOpts } = opts || {};
    innerOpts.sortTypes = innerOpts.sortTypes || false;
    const exclude = Array.isArray(innerOpts.exclude) ? innerOpts.exclude : [];
    if (deep) {
      let r = '';
      r += printObject(this.getType(), innerOpts);

      const nestedTypes = Array.from(this.getNestedTCs({ exclude }));
      const sortMethod = getSortMethodFromOption(innerOpts.sortAll || innerOpts.sortTypes);
      if (sortMethod) {
        nestedTypes.sort(sortMethod);
      }
      nestedTypes.forEach((t) => {
        if (t !== this && !exclude.includes(t.getTypeName())) {
          const sdl = t.toSDL(innerOpts);
          if (sdl) r += `\n\n${sdl}`;
        }
      });
      return r;
    }

    return printObject(this.getType(), innerOpts);
  }
}
