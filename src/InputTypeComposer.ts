import { GraphQLInputObjectType } from './graphql';
import { resolveMaybeThunk, upperFirst, inspect, mapEachKey } from './utils/misc';
import { isObject, isFunction, isString } from './utils/is';
import { typeByPath, TypeInPath } from './utils/typeByPath';
import type {
  Thunk,
  ThunkWithSchemaComposer,
  ObjMap,
  Extensions,
  Directive,
  DirectiveArgs,
} from './utils/definitions';
import { SchemaComposer } from './SchemaComposer';
import { ListComposer } from './ListComposer';
import { NonNullComposer } from './NonNullComposer';
import type { ThunkComposer } from './ThunkComposer';
import type { TypeAsString, TypeDefinitionString } from './TypeMapper';
import type {
  GraphQLInputFieldConfig,
  GraphQLInputFieldConfigMap,
  GraphQLInputType,
  InputValueDefinitionNode,
} from './graphql';
import { graphqlVersion } from './utils/graphqlVersion';
import { defineInputFieldMap, convertInputFieldMapToConfig } from './utils/configToDefine';
import {
  unwrapInputTC,
  isTypeNameString,
  cloneTypeTo,
  NamedTypeComposer,
  ComposeInputType,
  ComposeNamedInputType,
  ComposeInputTypeDefinition,
} from './utils/typeHelpers';
import { printInputObject, SchemaPrinterOptions } from './utils/schemaPrinter';
import { getInputObjectTypeDefinitionNode } from './utils/definitionNode';
import { getSortMethodFromOption } from './utils/schemaPrinterSortTypes';

export type InputTypeComposerDefinition =
  | TypeAsString
  | TypeDefinitionString
  | InputTypeComposerAsObjectDefinition
  | Readonly<GraphQLInputObjectType>;

export type InputTypeComposerAsObjectDefinition = {
  name: string;
  fields: ThunkWithSchemaComposer<InputTypeComposerFieldConfigMapDefinition, SchemaComposer<any>>;
  description?: null | string;
  extensions?: Extensions;
  directives?: Directive[];
};

export type InputTypeComposerFieldConfigMap = ObjMap<InputTypeComposerFieldConfig>;
export type InputTypeComposerFieldConfigMapDefinition = ObjMap<InputTypeComposerFieldConfigDefinition>;

export type InputTypeComposerFieldConfigDefinition =
  | ThunkWithSchemaComposer<InputTypeComposerFieldConfigAsObjectDefinition, SchemaComposer<any>>
  | ThunkWithSchemaComposer<ComposeInputTypeDefinition, SchemaComposer<any>>;

export type InputTypeComposerFieldConfigAsObjectDefinition = {
  type: ThunkWithSchemaComposer<ComposeInputTypeDefinition, SchemaComposer<any>>;
  defaultValue?: unknown;
  description?: string | null;
  extensions?: Extensions;
  directives?: Directive[];
  [key: string]: unknown;
};

export type InputTypeComposerFieldConfig = {
  type: ComposeInputType;
  defaultValue?: unknown;
  description?: string | null;
  astNode?: InputValueDefinitionNode | null;
  extensions?: Extensions;
  directives?: Directive[];
  [key: string]: unknown;
};

export type InputTypeComposerThunked<TContext> =
  | InputTypeComposer<TContext>
  | ThunkComposer<InputTypeComposer<TContext>, GraphQLInputType>;

export class InputTypeComposer<TContext = any> {
  schemaComposer: SchemaComposer<TContext>;
  _gqType: GraphQLInputObjectType;
  _gqcFields: InputTypeComposerFieldConfigMap;
  _gqcExtensions?: Extensions;
  _gqcDirectives?: Directive[];
  _gqcIsModified?: boolean;

  /**
   * Create `InputTypeComposer` with adding it by name to the `SchemaComposer`.
   */
  static create<TCtx = any>(
    typeDef: InputTypeComposerDefinition,
    schemaComposer: SchemaComposer<TCtx>
  ): InputTypeComposer<TCtx> {
    if (!(schemaComposer instanceof SchemaComposer)) {
      throw new Error(
        'You must provide SchemaComposer instance as a second argument for `InputTypeComposer.create(typeDef, schemaComposer)`'
      );
    }

    if (schemaComposer.hasInstance(typeDef, InputTypeComposer)) {
      return schemaComposer.getITC(typeDef);
    }

    const itc = this.createTemp(typeDef, schemaComposer);
    schemaComposer.add(itc);
    return itc;
  }

  /**
   * Create `InputTypeComposer` without adding it to the `SchemaComposer`. This method may be useful in plugins, when you need to create type temporary.
   */
  static createTemp<TCtx = any>(
    typeDef: InputTypeComposerDefinition,
    schemaComposer?: SchemaComposer<TCtx>
  ): InputTypeComposer<TCtx> {
    const sc = schemaComposer || new SchemaComposer();

    let ITC;

    if (isString(typeDef)) {
      const typeName: string = typeDef;
      if (isTypeNameString(typeName)) {
        ITC = new InputTypeComposer(
          new GraphQLInputObjectType({
            name: typeName,
            fields: () => ({}),
          }),
          sc
        );
      } else {
        ITC = sc.typeMapper.convertSDLTypeDefinition(typeName);
        if (!(ITC instanceof InputTypeComposer)) {
          throw new Error(
            'You should provide correct GraphQLInputObjectType type definition. ' +
              'Eg. `input MyInputType { name: String! }`'
          );
        }
      }
    } else if (typeDef instanceof GraphQLInputObjectType) {
      ITC = new InputTypeComposer(typeDef, sc);
    } else if (isObject(typeDef)) {
      const type = new GraphQLInputObjectType({
        name: typeDef.name,
        description: typeDef.description,
        fields: () => ({}),
      });
      ITC = new InputTypeComposer(type, sc);
      const fields = (typeDef as any).fields;
      if (isFunction(fields)) {
        // `convertInputFieldMapToConfig` helps to solve hoisting problems
        // rewrap fields `() => { f1: { type: A } }` -> `{ f1: { type: () => A } }`
        ITC.addFields(convertInputFieldMapToConfig(fields, sc));
      }
      if (isObject(fields)) ITC.addFields(fields);
      ITC.setExtensions(typeDef.extensions || undefined);
      if (Array.isArray((typeDef as any)?.directives)) {
        ITC.setDirectives((typeDef as any).directives);
      }
    } else {
      throw new Error(
        `You should provide InputObjectConfig or string with type name to InputTypeComposer.create(typeDef). Provided:\n${inspect(
          typeDef
        )}`
      );
    }

    return ITC;
  }

  constructor(graphqlType: GraphQLInputObjectType, schemaComposer: SchemaComposer<TContext>) {
    if (!(schemaComposer instanceof SchemaComposer)) {
      throw new Error(
        'You must provide SchemaComposer instance as a second argument for `new InputTypeComposer(GraphQLInputType, SchemaComposer)`'
      );
    }
    if (!(graphqlType instanceof GraphQLInputObjectType)) {
      throw new Error('InputTypeComposer accept only GraphQLInputObjectType in constructor');
    }

    this.schemaComposer = schemaComposer;
    this._gqType = graphqlType;

    // add itself to TypeStorage on create
    // it avoids recursive type use errors
    this.schemaComposer.set(graphqlType, this);
    this.schemaComposer.set(graphqlType.name, this);

    if (graphqlVersion >= 14) {
      this._gqcFields = convertInputFieldMapToConfig(
        (this._gqType as any)._fields,
        this.schemaComposer
      );
    } else {
      const fields: Thunk<GraphQLInputFieldConfigMap> = (this._gqType as any)._typeConfig.fields;
      this._gqcFields = this.schemaComposer.typeMapper.convertInputFieldConfigMap(
        (resolveMaybeThunk(fields) as any) || {},
        this.getTypeName()
      );
    }

    if (!this._gqType.astNode) {
      this._gqType.astNode = getInputObjectTypeDefinitionNode(this);
    }
    this._gqcIsModified = false;
  }

  // -----------------------------------------------
  // Field methods
  // -----------------------------------------------

  getFields(): InputTypeComposerFieldConfigMap {
    return this._gqcFields;
  }

  getFieldNames(): string[] {
    return Object.keys(this._gqcFields);
  }

  hasField(fieldName: string): boolean {
    return !!this._gqcFields[fieldName];
  }

  setFields(fields: InputTypeComposerFieldConfigMapDefinition): this {
    this._gqcFields = {};
    Object.keys(fields).forEach((name) => {
      this.setField(name, fields[name]);
    });
    return this;
  }

  setField(fieldName: string, fieldConfig: InputTypeComposerFieldConfigDefinition): this {
    this._gqcFields[fieldName] = isFunction(fieldConfig)
      ? (fieldConfig as any)
      : this.schemaComposer.typeMapper.convertInputFieldConfig(
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
  addFields(newFields: InputTypeComposerFieldConfigMapDefinition): this {
    Object.keys(newFields).forEach((name) => {
      this.setField(name, newFields[name]);
    });
    return this;
  }

  /**
   * Add new fields or replace existed (where field name may have dots)
   */
  addNestedFields(newFields: InputTypeComposerFieldConfigMapDefinition): this {
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
          childTC = InputTypeComposer.create(
            `${this.getTypeName()}${upperFirst(name)}`,
            this.schemaComposer
          );
          this.setField(name, childTC);
        } else {
          childTC = this.getFieldTC(name);
        }
        if (childTC instanceof InputTypeComposer) {
          childTC.addNestedFields({ [names.join('.')]: fc });
        }
      }
    });

    return this;
  }

  getField(fieldName: string): InputTypeComposerFieldConfig {
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
        `Cannot get field '${fieldName}' from input type '${this.getTypeName()}'. Field does not exist.`
      );
    }

    return field;
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
          if (subTC instanceof InputTypeComposer) {
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

  extendField(
    fieldName: string,
    partialFieldConfig: Partial<InputTypeComposerFieldConfigAsObjectDefinition>
  ): this {
    let prevFieldConfig;
    try {
      prevFieldConfig = this.getField(fieldName);
    } catch (e) {
      throw new Error(
        `Cannot extend field '${fieldName}' from input type '${this.getTypeName()}'. Field does not exist.`
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

  reorderFields(names: string[]): this {
    const orderedFields = {} as InputTypeComposerFieldConfigMap;
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

  getFieldConfig(fieldName: string): GraphQLInputFieldConfig {
    const { type, ...rest } = this.getField(fieldName);
    return {
      type: type.getType(),
      ...rest,
    };
  }

  getFieldType(fieldName: string): GraphQLInputType {
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
  getFieldTC(fieldName: string): ComposeNamedInputType<TContext> {
    const anyTC = this.getField(fieldName).type;
    return unwrapInputTC(anyTC);
  }

  /**
   * Alias for `getFieldTC()` but returns statically checked InputTypeComposer.
   * If field have other type then error will be thrown.
   */
  getFieldITC(fieldName: string): InputTypeComposer<TContext> {
    const tc = this.getFieldTC(fieldName);
    if (!(tc instanceof InputTypeComposer)) {
      throw new Error(
        `${this.getTypeName()}.getFieldITC('${fieldName}') must be InputTypeComposer, but received ${
          tc.constructor.name
        }. Maybe you need to use 'getFieldTC()' method which returns any type composer?`
      );
    }
    return tc;
  }

  // alias for `isFieldNonNull()` (may be deprecated in future)
  isRequired(fieldName: string): boolean {
    return this.isFieldNonNull(fieldName);
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

  /**
   * An alias for `makeFieldNonNull()`
   */
  makeRequired(fieldNameOrArray: string | string[]): this {
    return this.makeFieldNonNull(fieldNameOrArray);
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

  /**
   * An alias for `makeFieldNullable()`
   */
  makeOptional(fieldNameOrArray: string | string[]): this {
    return this.makeFieldNullable(fieldNameOrArray);
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

  // -----------------------------------------------
  // Type methods
  // -----------------------------------------------

  getType(): GraphQLInputObjectType {
    if (this._gqcIsModified) {
      this._gqcIsModified = false;
      this._gqType.astNode = getInputObjectTypeDefinitionNode(this);
      if (graphqlVersion >= 14) {
        (this._gqType as any)._fields = () => {
          return defineInputFieldMap(
            this._gqType,
            mapEachKey(this._gqcFields, (_, name) => this.getFieldConfig(name)) as any,
            this._gqType.astNode
          );
        };
      } else {
        (this._gqType as any)._typeConfig.fields = () => {
          return mapEachKey(this._gqcFields, (_, name) => this.getFieldConfig(name));
        };
        delete (this._gqType as any)._fields;
      }
    }
    return this._gqType;
  }

  getTypePlural(): ListComposer<InputTypeComposer<TContext>> {
    return new ListComposer(this);
  }

  getTypeNonNull(): NonNullComposer<InputTypeComposer<TContext>> {
    return new NonNullComposer(this);
  }

  /**
   * Get Type wrapped in List modifier
   *
   * @example
   *   const UserTC = schemaComposer.createInputTC(`input UserInput { name: String }`);
   *   schemaComposer.Mutation.addFields({
   *     add: {
   *       args: {
   *         users1: UserTC.List, // in SDL: users1: [UserInput]
   *         users2: UserTC.NonNull.List, // in SDL: users2: [UserInput!]
   *         users3: UserTC.NonNull.List.NonNull, // in SDL: users2: [UserInput!]!
   *       }
   *     }
   *   })
   */
  get List(): ListComposer<InputTypeComposer<TContext>> {
    return new ListComposer(this);
  }

  /**
   * Get Type wrapped in NonNull modifier
   *
   * @example
   *   const UserTC = schemaComposer.createInputTC(`input UserInput { name: String }`);
   *   schemaComposer.Mutation.addFields({
   *     add: {
   *       args: {
   *         users1: UserTC.List, // in SDL: users1: [UserInput]
   *         users2: UserTC.NonNull.List, // in SDL: users2: [UserInput!]
   *         users3: UserTC.NonNull.List.NonNull, // in SDL: users2: [UserInput!]!
   *       }
   *     }
   *   })
   */
  get NonNull(): NonNullComposer<InputTypeComposer<TContext>> {
    return new NonNullComposer(this);
  }

  getTypeName(): string {
    return this._gqType.name;
  }

  setTypeName(name: string): this {
    this._gqType.name = name;
    this._gqcIsModified = true;
    this.schemaComposer.set(name, this);
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
  clone(newTypeNameOrTC: string | InputTypeComposer<any>): InputTypeComposer<TContext> {
    if (!newTypeNameOrTC) {
      throw new Error('You should provide new type name for clone() method');
    }

    const cloned =
      newTypeNameOrTC instanceof InputTypeComposer
        ? newTypeNameOrTC
        : InputTypeComposer.create(newTypeNameOrTC, this.schemaComposer);

    cloned._gqcFields = mapEachKey(this._gqcFields, (fieldConfig) => ({
      ...fieldConfig,
      extensions: { ...fieldConfig.extensions },
      directives: fieldConfig.directives && [...(fieldConfig.directives || [])],
    }));
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
  ): InputTypeComposer<any> {
    if (!anotherSchemaComposer) {
      throw new Error('You should provide SchemaComposer for InputTypeComposer.cloneTo()');
    }

    if (cloneMap.has(this)) return cloneMap.get(this);
    const cloned = InputTypeComposer.create(this.getTypeName(), anotherSchemaComposer);
    cloneMap.set(this, cloned);

    cloned._gqcFields = mapEachKey(this._gqcFields, (fieldConfig) => ({
      ...fieldConfig,
      type: cloneTypeTo(fieldConfig.type, anotherSchemaComposer, cloneMap) as ComposeInputType,
      extensions: { ...fieldConfig.extensions },
    }));
    cloned._gqcExtensions = { ...this._gqcExtensions };
    cloned.setDescription(this.getDescription());

    return cloned;
  }

  merge(type: GraphQLInputObjectType | InputTypeComposer<any>): this {
    let tc: InputTypeComposer<any>;
    if (type instanceof GraphQLInputObjectType) {
      tc = InputTypeComposer.createTemp(type, this.schemaComposer);
    } else if (type instanceof InputTypeComposer) {
      tc = type;
    } else {
      throw new Error(
        `Cannot merge ${inspect(
          type
        )} with InputObjectType(${this.getTypeName()}). Provided type should be GraphQLInputObjectType or InputTypeComposer.`
      );
    }

    // deep clone all fields
    const fields = { ...tc.getFields() } as InputTypeComposerFieldConfigMapDefinition;
    Object.keys(fields).forEach((fieldName) => {
      fields[fieldName] = {
        ...(fields[fieldName] as any),
        // set type as SDL string, it automatically will be remapped to the correct type instance in the current schema
        type: tc.getFieldTypeName(fieldName),
      };
    });
    this.addFields(fields);

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
    this._gqcExtensions = extensions || undefined;
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
      exclude?: string[] | null;
    } = {},
    passedTypes: Set<NamedTypeComposer<any>> = new Set()
  ): Set<NamedTypeComposer<any>> {
    const exclude = Array.isArray(opts.exclude) ? opts.exclude : [];
    this.getFieldNames().forEach((fieldName) => {
      const itc = this.getFieldTC(fieldName);
      if (!passedTypes.has(itc) && !exclude.includes(itc.getTypeName())) {
        passedTypes.add(itc);
        if (itc instanceof InputTypeComposer) {
          itc.getNestedTCs(opts, passedTypes);
        }
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
      r += printInputObject(this.getType(), innerOpts);

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

    return printInputObject(this.getType(), innerOpts);
  }
}
