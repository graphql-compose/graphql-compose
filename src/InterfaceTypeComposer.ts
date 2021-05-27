import { GraphQLInterfaceType, GraphQLObjectType } from './graphql';
import { isObject, isString, isFunction } from './utils/is';
import { resolveMaybeThunk, inspect, mapEachKey } from './utils/misc';
import { ObjectTypeComposer } from './ObjectTypeComposer';
import type {
  GraphQLFieldConfig,
  GraphQLFieldConfigMap,
  GraphQLOutputType,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLResolveInfo,
  GraphQLTypeResolver,
} from './graphql';
import { InputTypeComposer } from './InputTypeComposer';
import { UnionTypeComposer } from './UnionTypeComposer';
import { EnumTypeComposer } from './EnumTypeComposer';
import type { TypeAsString, TypeDefinitionString } from './TypeMapper';
import { SchemaComposer } from './SchemaComposer';
import type {
  ObjectTypeComposerFieldConfigMap,
  ObjectTypeComposerFieldConfig,
  ObjectTypeComposerFieldConfigDefinition,
  ObjectTypeComposerFieldConfigAsObjectDefinition,
  ObjectTypeComposerFieldConfigMapDefinition,
  ObjectTypeComposerArgumentConfigMapDefinition,
  ObjectTypeComposerArgumentConfig,
  ObjectTypeComposerArgumentConfigDefinition,
  ObjectTypeComposerArgumentConfigMap,
} from './ObjectTypeComposer';
import { ListComposer } from './ListComposer';
import { NonNullComposer } from './NonNullComposer';
import { ThunkComposer } from './ThunkComposer';
import type {
  Thunk,
  Extensions,
  MaybePromise,
  DirectiveArgs,
  Directive,
  ThunkWithSchemaComposer,
} from './utils/definitions';
import { toInputObjectType } from './utils/toInputType';
import type { ToInputTypeOpts } from './utils/toInputType';
import { typeByPath, TypeInPath } from './utils/typeByPath';
import {
  getComposeTypeName,
  getGraphQLType,
  unwrapOutputTC,
  unwrapInputTC,
  isTypeNameString,
  cloneTypeTo,
  NamedTypeComposer,
} from './utils/typeHelpers';
import {
  defineFieldMap,
  convertObjectFieldMapToConfig,
  convertInterfaceArrayAsThunk,
} from './utils/configToDefine';
import { graphqlVersion } from './utils/graphqlVersion';
import type { ComposeNamedInputType, ComposeNamedOutputType } from './utils/typeHelpers';
import { printInterface, SchemaPrinterOptions } from './utils/schemaPrinter';
import { getInterfaceTypeDefinitionNode } from './utils/definitionNode';
import { getSortMethodFromOption } from './utils/schemaPrinterSortTypes';

export type InterfaceTypeComposerDefinition<TSource, TContext> =
  | TypeAsString
  | TypeDefinitionString
  | InterfaceTypeComposerAsObjectDefinition<TSource, TContext>
  | GraphQLInterfaceType
  | Readonly<InterfaceTypeComposerThunked<any, TContext>>;

export type InterfaceTypeComposerAsObjectDefinition<TSource, TContext> = {
  name: string;
  fields?: ObjectTypeComposerFieldConfigMapDefinition<TSource, TContext>;
  interfaces?: null | ThunkWithSchemaComposer<
    ReadonlyArray<InterfaceTypeComposerDefinition<any, TContext>>,
    SchemaComposer<TContext>
  >;
  resolveType?: null | GraphQLTypeResolver<TSource, TContext>;
  description?: null | string;
  extensions?: Extensions;
  directives?: Directive[];
};

export type InterfaceTypeComposerResolversMap<TContext> = Map<
  ObjectTypeComposer<any, TContext> | GraphQLObjectType,
  InterfaceTypeComposerResolverCheckFn<any, TContext>
>;

export type InterfaceTypeComposerResolverCheckFn<TSource, TContext> = (
  value: TSource,
  context: TContext,
  info: GraphQLResolveInfo
) => MaybePromise<boolean | null | void>;

export type InterfaceTypeComposerThunked<TReturn, TContext> =
  | InterfaceTypeComposer<TReturn, TContext>
  | ThunkComposer<InterfaceTypeComposer<any, any>, GraphQLInterfaceType>;

/**
 * Class that helps to create `GraphQLInterfaceType`s and provide ability to modify them.
 */
export class InterfaceTypeComposer<TSource = any, TContext = any> {
  schemaComposer: SchemaComposer<TContext>;
  _gqType: GraphQLInterfaceType;
  _gqcFields: ObjectTypeComposerFieldConfigMap<TSource, TContext>;
  _gqcInputTypeComposer: undefined | InputTypeComposer<TContext>;
  _gqcInterfaces: Array<InterfaceTypeComposerThunked<TSource, TContext>> = [];
  _gqcTypeResolvers: undefined | InterfaceTypeComposerResolversMap<TContext>;
  _gqcFallbackResolveType: ObjectTypeComposer<any, TContext> | GraphQLObjectType | null = null;
  _gqcExtensions?: Extensions;
  _gqcDirectives?: Directive[];
  _gqcIsModified?: boolean;

  /**
   * Create `InterfaceTypeComposer` with adding it by name to the `SchemaComposer`.
   */
  static create<TSrc = any, TCtx = any>(
    typeDef: InterfaceTypeComposerDefinition<TSrc, TCtx>,
    schemaComposer: SchemaComposer<TCtx>
  ): InterfaceTypeComposer<TSrc, TCtx> {
    if (!(schemaComposer instanceof SchemaComposer)) {
      throw new Error(
        'You must provide SchemaComposer instance as a second argument for `InterfaceTypeComposer.create(typeDef, schemaComposer)`'
      );
    }

    if (schemaComposer.hasInstance(typeDef, InterfaceTypeComposer)) {
      return schemaComposer.getIFTC(typeDef);
    }

    const iftc = this.createTemp(typeDef, schemaComposer);
    schemaComposer.add(iftc);
    return iftc;
  }

  /**
   * Create `InterfaceTypeComposer` without adding it to the `SchemaComposer`. This method may be usefull in plugins, when you need to create type temporary.
   */
  static createTemp<TSrc = any, TCtx = any>(
    typeDef: InterfaceTypeComposerDefinition<TSrc, TCtx>,
    schemaComposer?: SchemaComposer<TCtx>
  ): InterfaceTypeComposer<TSrc, TCtx> {
    const sc = schemaComposer || new SchemaComposer();

    let IFTC;

    if (isString(typeDef)) {
      const typeName: string = typeDef;
      if (isTypeNameString(typeName)) {
        IFTC = new InterfaceTypeComposer(
          new GraphQLInterfaceType({
            name: typeName,
            fields: () => ({}),
          }),
          sc
        );
      } else {
        IFTC = sc.typeMapper.convertSDLTypeDefinition(typeName);
        if (!(IFTC instanceof InterfaceTypeComposer)) {
          throw new Error(
            'You should provide correct GraphQLInterfaceType type definition. ' +
              'Eg. `interface MyType { id: ID!, name: String! }`'
          );
        }
      }
    } else if (typeDef instanceof GraphQLInterfaceType) {
      IFTC = new InterfaceTypeComposer(typeDef, sc);
    } else if (typeDef instanceof InterfaceTypeComposer) {
      IFTC = typeDef;
    } else if (isObject(typeDef) && !(typeDef instanceof InterfaceTypeComposer)) {
      const type = new GraphQLInterfaceType({
        ...(typeDef as any),
        fields: () => ({}),
      });
      IFTC = new InterfaceTypeComposer(type, sc);

      const fields = (typeDef as any).fields;
      if (isFunction(fields)) {
        // `convertOutputFieldMapToConfig` helps to solve hoisting problems
        // rewrap fields `() => { f1: { type: A } }` -> `{ f1: { type: () => A } }`
        IFTC.addFields(convertObjectFieldMapToConfig(fields, sc));
      } else if (isObject(fields)) {
        IFTC.addFields(fields);
      }

      const interfaces = (typeDef as any).interfaces;
      if (Array.isArray(interfaces)) IFTC.setInterfaces(interfaces);
      else if (isFunction(interfaces)) {
        // rewrap interfaces `() => [i1, i2]` -> `[()=>i1, ()=>i2]`
        // helps to solve hoisting problems
        IFTC.setInterfaces(convertInterfaceArrayAsThunk(interfaces, sc));
      }

      IFTC.setExtensions((typeDef as any).extensions);
      if (Array.isArray((typeDef as any)?.directives)) {
        IFTC.setDirectives((typeDef as any).directives);
      }
    } else {
      throw new Error(
        `You should provide GraphQLInterfaceTypeConfig or string with interface name or SDL definition. Provided:\n${inspect(
          typeDef
        )}`
      );
    }

    return IFTC;
  }

  constructor(graphqlType: GraphQLInterfaceType, schemaComposer: SchemaComposer<TContext>) {
    if (!(schemaComposer instanceof SchemaComposer)) {
      throw new Error(
        'You must provide SchemaComposer instance as a second argument for `new InterfaceTypeComposer(GraphQLInterfaceType, SchemaComposer)`'
      );
    }
    if (!(graphqlType instanceof GraphQLInterfaceType)) {
      throw new Error('InterfaceTypeComposer accept only GraphQLInterfaceType in constructor');
    }

    this.schemaComposer = schemaComposer;
    this._gqType = graphqlType;

    // add itself to TypeStorage on create
    // it avoids recursive type use errors
    this.schemaComposer.set(graphqlType, this);
    this.schemaComposer.set(graphqlType.name, this);

    if (graphqlVersion >= 15) {
      this._gqcFields = convertObjectFieldMapToConfig(
        (this._gqType as any)._fields,
        this.schemaComposer
      );
      this._gqcInterfaces = convertInterfaceArrayAsThunk(
        (this._gqType as any)._interfaces,
        this.schemaComposer
      );
    } else if (graphqlVersion >= 14) {
      this._gqcFields = convertObjectFieldMapToConfig(
        (this._gqType as any)._fields,
        this.schemaComposer
      );
    } else {
      // read
      const fields: Thunk<GraphQLFieldConfigMap<any, TContext>> = (this._gqType as any)._typeConfig
        .fields;
      this._gqcFields = this.schemaComposer.typeMapper.convertOutputFieldConfigMap(
        (resolveMaybeThunk(fields) as any) || {},
        this.getTypeName()
      );
    }

    if (!this._gqType.astNode) {
      this._gqType.astNode = getInterfaceTypeDefinitionNode(this);
    }
    this._gqcIsModified = false;
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

  getField(fieldName: string): ObjectTypeComposerFieldConfig<TSource, TContext> {
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

  setField(
    fieldName: string,
    fieldConfig: ObjectTypeComposerFieldConfigDefinition<TSource, TContext>
  ): this {
    (this._gqcFields as any)[fieldName] = isFunction(fieldConfig)
      ? fieldConfig
      : this.schemaComposer.typeMapper.convertOutputFieldConfig(
          fieldConfig,
          fieldName,
          this.getTypeName()
        );
    this._gqcIsModified = true;
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
        this._gqcIsModified = true;
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
        this._gqcIsModified = true;
      }
    });
    return this;
  }

  reorderFields(names: string[]): this {
    const orderedFields = {} as ObjectTypeComposerFieldConfigMap<TSource, TContext>;
    const fields = this._gqcFields;
    names.forEach((name) => {
      if (fields[name]) {
        orderedFields[name] = fields[name];
        delete fields[name];
      }
    });
    this._gqcFields = { ...orderedFields, ...fields };
    this._gqcIsModified = true;
    return this;
  }

  extendField(
    fieldName: string,
    partialFieldConfig: Partial<ObjectTypeComposerFieldConfigAsObjectDefinition<TSource, TContext>>
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
      ...partialFieldConfig,
      extensions: {
        ...(prevFieldConfig.extensions || {}),
        ...(partialFieldConfig.extensions || {}),
      },
      directives: [...(prevFieldConfig.directives || []), ...(partialFieldConfig.directives || [])],
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
        this._gqcIsModified = true;
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
        this._gqcIsModified = true;
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
        this._gqcIsModified = true;
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
          this._gqcIsModified = true;
        } else if (fc.type instanceof NonNullComposer && fc.type.ofType instanceof ListComposer) {
          fc.type =
            fc.type.ofType.ofType instanceof NonNullComposer
              ? fc.type.ofType.ofType
              : new NonNullComposer(fc.type.ofType.ofType);
          this._gqcIsModified = true;
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
          `Cannot deprecate non-existent field '${fields}' from interface type '${this.getTypeName()}'`
        );
      }
      this.extendField(fields, { deprecationReason: 'deprecated' });
    } else if (Array.isArray(fields)) {
      fields.forEach((field) => {
        if (existedFieldNames.indexOf(field) === -1) {
          throw new Error(
            `Cannot deprecate non-existent field '${field}' from interface type '${this.getTypeName()}'`
          );
        }
        this.extendField(field, { deprecationReason: 'deprecated' });
      });
    } else {
      const fieldMap = fields;
      Object.keys(fieldMap).forEach((field) => {
        if (existedFieldNames.indexOf(field) === -1) {
          throw new Error(
            `Cannot deprecate non-existent field '${field}' from interface type '${this.getTypeName()}'`
          );
        }
        const deprecationReason: string = fieldMap[field];
        this.extendField(field, { deprecationReason });
      });
    }

    return this;
  }

  getFieldArgs<TArgs = any>(fieldName: string): ObjectTypeComposerArgumentConfigMap<TArgs> {
    try {
      const fc = this.getField(fieldName);
      return fc.args || {};
    } catch (e) {
      throw new Error(
        `Cannot get field args. Field '${fieldName}' from type '${this.getTypeName()}' does not exist.`
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
    this._gqcIsModified = true;
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
    this._gqcIsModified = true;
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
    this._gqcIsModified = true;
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
        this._gqcIsModified = true;
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
          this._gqcIsModified = true;
        } else if (ac.type instanceof NonNullComposer && ac.type.ofType instanceof ListComposer) {
          ac.type =
            ac.type.ofType.ofType instanceof NonNullComposer
              ? ac.type.ofType.ofType
              : new NonNullComposer(ac.type.ofType.ofType);
          this._gqcIsModified = true;
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
        this._gqcIsModified = true;
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
        this._gqcIsModified = true;
      }
    });
    return this;
  }

  // -----------------------------------------------
  // Type methods
  // -----------------------------------------------

  getType(): GraphQLInterfaceType {
    if (this._gqcIsModified) {
      this._gqcIsModified = false;
      this._gqType.astNode = getInterfaceTypeDefinitionNode(this);
      if (graphqlVersion >= 15) {
        (this._gqType as any)._fields = () =>
          defineFieldMap(
            this._gqType,
            mapEachKey(this._gqcFields, (_, name) => this.getFieldConfig(name)),
            this._gqType.astNode
          );
        (this._gqType as any)._interfaces = () => this.getInterfacesTypes();
      } else if (graphqlVersion >= 14) {
        (this._gqType as any)._fields = () =>
          defineFieldMap(
            this._gqType,
            mapEachKey(this._gqcFields, (_, name) => this.getFieldConfig(name)),
            this._gqType.astNode
          );
      } else {
        (this._gqType as any)._typeConfig.fields = () => {
          return mapEachKey(this._gqcFields, (_, name) => this.getFieldConfig(name));
        };
        (this._gqType as any)._fields = {}; // clear builded fields in type
      }
    }
    return this._gqType;
  }

  getTypePlural(): ListComposer<InterfaceTypeComposer<TSource, TContext>> {
    return new ListComposer(this);
  }

  getTypeNonNull(): NonNullComposer<InterfaceTypeComposer<TSource, TContext>> {
    return new NonNullComposer(this);
  }

  /**
   * Get Type wrapped in List modifier
   *
   * @example
   *   const UserTC = schemaComposer.createInterfaceTC(`interface UserIface { name: String }`);
   *   schemaComposer.Query.addFields({
   *     users1: { type: UserTC.List }, // in SDL: users1: [UserIface]
   *     users2: { type: UserTC.NonNull.List }, // in SDL: users2: [UserIface!]
   *     users3: { type: UserTC.NonNull.List.NonNull }, // in SDL: users2: [UserIface!]!
   *   })
   */
  get List(): ListComposer<InterfaceTypeComposer<TSource, TContext>> {
    return new ListComposer(this);
  }

  /**
   * Get Type wrapped in NonNull modifier
   *
   * @example
   *   const UserTC = schemaComposer.createInterfaceTC(`interface UserIface { name: String }`);
   *   schemaComposer.Query.addFields({
   *     users1: { type: UserTC.List }, // in SDL: users1: [UserIface]
   *     users2: { type: UserTC.NonNull.List }, // in SDL: users2: [UserIface!]!
   *     users3: { type: UserTC.NonNull.List.NonNull }, // in SDL: users2: [UserIface!]!
   *   })
   */
  get NonNull(): NonNullComposer<InterfaceTypeComposer<TSource, TContext>> {
    return new NonNullComposer(this);
  }

  getTypeName(): string {
    return this._gqType.name;
  }

  setTypeName(name: string): this {
    this._gqType.name = name;
    this._gqcIsModified = true;
    this.schemaComposer.add(this);
    return this;
  }

  getDescription(): string {
    return this._gqType.description || '';
  }

  setDescription(description: string): this {
    this._gqType.description = description;
    this._gqcIsModified = true;
    return this;
  }

  /**
   * You may clone this type with a new provided name as string.
   * Or you may provide a new TypeComposer which will get all cloned
   * settings from this type.
   */
  clone(
    newTypeNameOrTC: string | InterfaceTypeComposer<any, any>
  ): InterfaceTypeComposer<TSource, TContext> {
    if (!newTypeNameOrTC) {
      throw new Error('You should provide newTypeName:string for InterfaceTypeComposer.clone()');
    }

    const cloned =
      newTypeNameOrTC instanceof InterfaceTypeComposer
        ? newTypeNameOrTC
        : InterfaceTypeComposer.create(newTypeNameOrTC, this.schemaComposer);

    cloned._gqcFields = mapEachKey(this._gqcFields, (fieldConfig) => ({
      ...fieldConfig,
      args: mapEachKey(fieldConfig.args, (argConfig) => ({
        ...argConfig,
        extensions: { ...argConfig.extensions },
        directives: [...(argConfig.directives || [])],
      })),
      extensions: { ...fieldConfig.extensions },
      directives: [...(fieldConfig.directives || [])],
    }));
    cloned._gqcInterfaces = [...this._gqcInterfaces];
    if (this._gqcTypeResolvers) {
      cloned._gqcTypeResolvers = new Map(this._gqcTypeResolvers);
    }
    cloned._gqcFallbackResolveType = this._gqcFallbackResolveType;
    cloned._gqcExtensions = { ...this._gqcExtensions };
    cloned.setDescription(this.getDescription());
    cloned.setDirectives(this.getDirectives());

    return cloned;
  }

  /**
   * Clone this type to another SchemaComposer.
   * Also will be cloned all sub-types.
   */
  cloneTo(
    anotherSchemaComposer: SchemaComposer<any>,
    cloneMap: Map<any, any> = new Map()
  ): InterfaceTypeComposer<any, any> {
    if (!anotherSchemaComposer) {
      throw new Error('You should provide SchemaComposer for InterfaceTypeComposer.cloneTo()');
    }

    if (cloneMap.has(this)) return cloneMap.get(this) as any;
    const cloned = InterfaceTypeComposer.create(this.getTypeName(), anotherSchemaComposer);
    cloneMap.set(this, cloned);

    cloned._gqcFields = mapEachKey(this._gqcFields, (fieldConfig) => ({
      ...fieldConfig,
      type: cloneTypeTo(fieldConfig.type, anotherSchemaComposer, cloneMap),
      args: mapEachKey(fieldConfig.args, (argConfig) => ({
        ...argConfig,
        type: cloneTypeTo(argConfig.type, anotherSchemaComposer, cloneMap),
        extensions: { ...argConfig.extensions },
        directives: [...(argConfig.directives || [])],
      })),
      extensions: { ...fieldConfig.extensions },
      directives: [...(fieldConfig.directives || [])],
    })) as any;
    cloned._gqcInterfaces = this._gqcInterfaces.map((i) =>
      i.cloneTo(anotherSchemaComposer, cloneMap)
    ) as any;
    cloned._gqcExtensions = { ...this._gqcExtensions };
    cloned.setDescription(this.getDescription());

    // clone this._gqcTypeResolvers
    const typeResolversMap = this.getTypeResolvers();
    if (typeResolversMap.size > 0) {
      const clonedTypeResolvers: InterfaceTypeComposerResolversMap<any> = new Map();
      typeResolversMap.forEach((fn, tc) => {
        const clonedTC = cloneTypeTo(tc, anotherSchemaComposer, cloneMap) as
          | ObjectTypeComposer<any, any>
          | GraphQLObjectType;
        clonedTypeResolvers.set(clonedTC, fn);
      });
      cloned.setTypeResolvers(clonedTypeResolvers);
    }
    if (this._gqcFallbackResolveType) {
      cloned._gqcFallbackResolveType = cloneTypeTo(
        this._gqcFallbackResolveType,
        anotherSchemaComposer,
        cloneMap
      ) as any;
    }

    return cloned;
  }

  merge(
    type:
      | GraphQLInterfaceType
      | GraphQLObjectType
      | InterfaceTypeComposer<any, any>
      | ObjectTypeComposer<any, any>
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
        )} with InterfaceType(${this.getTypeName()}). Provided type should be GraphQLInterfaceType, GraphQLObjectType, InterfaceTypeComposer or ObjectTypeComposer.`
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

  /**
   * An alias for `getInputTypeComposer()`
   */
  getITC(opts?: ToInputTypeOpts): InputTypeComposer<TContext> {
    return this.getInputTypeComposer(opts);
  }

  removeInputTypeComposer(): this {
    this._gqcInputTypeComposer = undefined;
    return this;
  }

  // -----------------------------------------------
  // ResolveType methods
  // -----------------------------------------------

  getResolveType(): GraphQLTypeResolver<TSource, TContext> | undefined | null {
    return this._gqType.resolveType;
  }

  setResolveType(fn: GraphQLTypeResolver<TSource, TContext> | undefined | null): this {
    this._gqType.resolveType = fn;
    this._gqcIsModified = true;
    return this;
  }

  hasTypeResolver(type: ObjectTypeComposer<any, TContext> | GraphQLObjectType): boolean {
    const typeResolversMap = this.getTypeResolvers();
    return typeResolversMap.has(type);
  }

  getTypeResolvers(): InterfaceTypeComposerResolversMap<TContext> {
    if (!this._gqcTypeResolvers) {
      this._gqcTypeResolvers = new Map();
    }
    return this._gqcTypeResolvers;
  }

  getTypeResolverCheckFn(
    type: ObjectTypeComposer<any, TContext> | GraphQLObjectType
  ): InterfaceTypeComposerResolverCheckFn<TSource, TContext> {
    const typeResolversMap = this.getTypeResolvers();

    if (!typeResolversMap.has(type)) {
      throw new Error(
        `Type resolve function in interface '${this.getTypeName()}' is not defined for type ${inspect(
          type
        )}.`
      );
    }

    return typeResolversMap.get(type) as any;
  }

  getTypeResolverNames(): string[] {
    const typeResolversMap = this.getTypeResolvers();
    const names = [] as string[];
    typeResolversMap.forEach((_, composeType) => {
      if (composeType instanceof ObjectTypeComposer) {
        names.push(composeType.getTypeName());
      } else if (composeType && composeType.name) {
        names.push(composeType.name);
      }
    });
    return names;
  }

  getTypeResolverTypes(): GraphQLObjectType[] {
    const typeResolversMap = this.getTypeResolvers();
    const types = [] as GraphQLObjectType[];
    typeResolversMap.forEach((_, composeType) => {
      types.push(getGraphQLType(composeType) as GraphQLObjectType);
    });
    return types;
  }

  setTypeResolvers(typeResolversMap: InterfaceTypeComposerResolversMap<TContext>): this {
    this._isTypeResolversValid(typeResolversMap);
    this._gqcTypeResolvers = typeResolversMap;
    this._initResolveTypeFn();
    return this;
  }

  _initResolveTypeFn(): this {
    const typeResolversMap = this._gqcTypeResolvers || new Map();
    const fallbackType = this._gqcFallbackResolveType
      ? (getGraphQLType(this._gqcFallbackResolveType) as GraphQLObjectType)
      : null;

    // extract GraphQLObjectType from ObjectTypeComposer
    const fastEntries = [] as Array<
      [GraphQLObjectType, InterfaceTypeComposerResolverCheckFn<any, any>]
    >;
    for (const [composeType, checkFn] of typeResolversMap.entries()) {
      fastEntries.push([getGraphQLType(composeType) as GraphQLObjectType, checkFn]);
    }

    let resolveType: GraphQLTypeResolver<TSource, TContext>;
    const isAsyncRuntime = this._isTypeResolversAsync(typeResolversMap);
    if (isAsyncRuntime) {
      resolveType = async (value, context, info) => {
        for (const [_gqType, checkFn] of fastEntries) {
          // should we run checkFn simultaneously or in serial?
          // Current decision is: don't SPIKE event loop - run in serial (it may be changed in future)
          // eslint-disable-next-line no-await-in-loop
          if (await checkFn(value, context, info)) return _gqType;
        }
        return fallbackType;
      };
    } else {
      resolveType = (value: any, context, info) => {
        for (const [_gqType, checkFn] of fastEntries) {
          if (checkFn(value, context, info)) return _gqType;
        }
        return fallbackType;
      };
    }

    this.setResolveType(resolveType);
    return this;
  }

  _isTypeResolversValid(typeResolversMap: InterfaceTypeComposerResolversMap<TContext>): true {
    if (!(typeResolversMap instanceof Map)) {
      throw new Error(
        `For interface ${this.getTypeName()} you should provide Map object for type resolvers.`
      );
    }

    for (const [composeType, checkFn] of typeResolversMap.entries()) {
      this._isTypeResolverValid(composeType, checkFn);
    }

    return true;
  }

  _isTypeResolverValid(
    composeType: ObjectTypeComposer<any, TContext> | GraphQLObjectType,
    checkFn: InterfaceTypeComposerResolverCheckFn<any, TContext>
  ): true {
    // checking composeType
    try {
      const type = getGraphQLType(composeType);
      if (!(type instanceof GraphQLObjectType)) throw new Error('Must be GraphQLObjectType');
    } catch (e) {
      throw new Error(
        `For interface type resolver ${this.getTypeName()} you must provide GraphQLObjectType or ObjectTypeComposer, but provided ${inspect(
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

    return true;
  }

  // eslint-disable-next-line class-methods-use-this
  _isTypeResolversAsync(typeResolversMap: InterfaceTypeComposerResolversMap<TContext>): boolean {
    let res = false;
    for (const [, checkFn] of typeResolversMap.entries()) {
      try {
        const r = checkFn({} as any, {} as any, {} as any);
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

  addTypeResolver<TSrc>(
    type: ObjectTypeComposer<TSrc, TContext> | GraphQLObjectType,
    checkFn: InterfaceTypeComposerResolverCheckFn<TSrc, TContext>
  ): this {
    const typeResolversMap = this.getTypeResolvers();
    this._isTypeResolverValid(type, checkFn);
    typeResolversMap.set(type, checkFn);
    this._initResolveTypeFn();

    // ensure that interface added to ObjectType
    if (type instanceof ObjectTypeComposer) {
      type.addInterface(this);
    }

    // ensure that resolved type will be in Schema
    this.schemaComposer.addSchemaMustHaveType(type);

    return this;
  }

  removeTypeResolver(type: ObjectTypeComposer<any, TContext> | GraphQLObjectType): this {
    const typeResolversMap = this.getTypeResolvers();
    typeResolversMap.delete(type);
    this._initResolveTypeFn();
    return this;
  }

  setTypeResolverFallback(
    type: ObjectTypeComposer<any, TContext> | GraphQLObjectType | null
  ): this {
    if (type) {
      // ensure that interface added to ObjectType
      if (type instanceof ObjectTypeComposer) {
        type.addInterface(this);
      }
      // ensure that resolved type will be in Schema
      this.schemaComposer.addSchemaMustHaveType(type);
    }

    this._gqcFallbackResolveType = type;
    this._initResolveTypeFn();
    return this;
  }

  // -----------------------------------------------
  // Sub-Interface methods
  // -----------------------------------------------

  getInterfaces(): Array<InterfaceTypeComposerThunked<TSource, TContext>> {
    return this._gqcInterfaces;
  }

  getInterfacesTypes(): Array<GraphQLInterfaceType> {
    return this._gqcInterfaces.map((i) => i.getType());
  }

  setInterfaces(interfaces: ReadonlyArray<InterfaceTypeComposerDefinition<any, TContext>>): this {
    this._gqcInterfaces = convertInterfaceArrayAsThunk(interfaces, this.schemaComposer);
    this._gqcIsModified = true;
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
      this._gqcIsModified = true;
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
        `InterfaceTypeComposer[${this.getTypeName()}].addInterfaces() accepts only array`
      );
    }
    ifaces.forEach((iface) => this.addInterface(iface));
    return this;
  }

  removeInterface(iface: InterfaceTypeComposerDefinition<any, TContext>): this {
    const typeName = getComposeTypeName(iface, this.schemaComposer);
    this._gqcInterfaces = this._gqcInterfaces.filter((i) => i.getTypeName() !== typeName);
    this._gqcIsModified = true;
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

  setExtensions(extensions: Extensions | undefined): this {
    this._gqcExtensions = extensions;
    this._gqcIsModified = true;
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
  // -----------------------------------------------

  getDirectives(): Array<Directive> {
    return this._gqcDirectives || [];
  }

  setDirectives(directives: Array<Directive>): this {
    this._gqcDirectives = directives;
    this._gqcIsModified = true;
    return this;
  }

  getDirectiveNames(): string[] {
    return this.getDirectives().map((d) => d.name);
  }

  /**
   * Returns arguments of first found directive by name.
   * If directive does not exists then will be returned undefined.
   */
  getDirectiveByName(directiveName: string): DirectiveArgs | undefined {
    const directive = this.getDirectives().find((d) => d.name === directiveName);
    if (!directive) return undefined;
    return directive.args;
  }

  /**
   * Set arguments of first found directive by name.
   * If directive does not exists then will be created new one.
   */
  setDirectiveByName(directiveName: string, args?: DirectiveArgs): this {
    const directives = this.getDirectives();
    const idx = directives.findIndex((d) => d.name === directiveName);
    if (idx >= 0) {
      directives[idx].args = args;
    } else {
      directives.push({ name: directiveName, args });
    }
    this.setDirectives(directives);
    return this;
  }

  getDirectiveById(idx: number): DirectiveArgs | undefined {
    const directive = this.getDirectives()[idx];
    if (!directive) return undefined;
    return directive.args;
  }

  getFieldDirectives(fieldName: string): Array<Directive> {
    return this.getField(fieldName).directives || [];
  }

  setFieldDirectives(fieldName: string, directives: Array<Directive> | undefined): this {
    const fc = this.getField(fieldName);
    fc.directives = directives;
    this._gqcIsModified = true;

    return this;
  }

  getFieldDirectiveNames(fieldName: string): string[] {
    return this.getFieldDirectives(fieldName).map((d) => d.name);
  }

  /**
   * Returns arguments of first found directive by name.
   * If directive does not exists then will be returned undefined.
   */
  getFieldDirectiveByName(fieldName: string, directiveName: string): DirectiveArgs | undefined {
    const directive = this.getFieldDirectives(fieldName).find((d) => d.name === directiveName);
    if (!directive) return undefined;
    return directive.args;
  }

  /**
   * Set arguments of first found directive by name.
   * If directive does not exists then will be created new one.
   */
  setFieldDirectiveByName(fieldName: string, directiveName: string, args?: DirectiveArgs): this {
    const directives = this.getFieldDirectives(fieldName);
    const idx = directives.findIndex((d) => d.name === directiveName);
    if (idx >= 0) {
      directives[idx].args = args;
    } else {
      directives.push({ name: directiveName, args });
    }
    this.setFieldDirectives(fieldName, directives);
    return this;
  }

  getFieldDirectiveById(fieldName: string, idx: number): DirectiveArgs | undefined {
    const directive = this.getFieldDirectives(fieldName)[idx];
    if (!directive) return undefined;
    return directive.args;
  }

  getFieldArgDirectives(fieldName: string, argName: string): Array<Directive> {
    return this.getFieldArg(fieldName, argName).directives || [];
  }

  setFieldArgDirectives(fieldName: string, argName: string, directives: Array<Directive>): this {
    const ac = this.getFieldArg(fieldName, argName);
    ac.directives = directives;
    this._gqcIsModified = true;
    return this;
  }

  getFieldArgDirectiveNames(fieldName: string, argName: string): string[] {
    return this.getFieldArgDirectives(fieldName, argName).map((d) => d.name);
  }

  /**
   * Returns arguments of first found directive by name.
   * If directive does not exists then will be returned undefined.
   */
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

  /**
   * Set arguments of first found directive by name.
   * If directive does not exists then will be created new one.
   */
  setFieldArgDirectiveByName(
    fieldName: string,
    argName: string,
    directiveName: string,
    args?: DirectiveArgs
  ): this {
    const directives = this.getFieldArgDirectives(fieldName, argName);
    const idx = directives.findIndex((d) => d.name === directiveName);
    if (idx >= 0) {
      directives[idx].args = args;
    } else {
      directives.push({ name: directiveName, args });
    }
    this.setFieldArgDirectives(fieldName, argName, directives);
    return this;
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

      this.getInterfaces().forEach((t) => {
        const iftc = t instanceof ThunkComposer ? t.ofType : t;
        if (!passedTypes.has(iftc) && !exclude.includes(iftc.getTypeName())) {
          passedTypes.add(iftc);
          iftc.getNestedTCs(opts, passedTypes);
        }
      });
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
      r += printInterface(this.getType(), innerOpts);

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

    return printInterface(this.getType(), innerOpts);
  }
}
