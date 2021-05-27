import keyMap from 'graphql/jsutils/keyMap';
import { GraphQLEnumType } from './graphql';
import { isObject, isString } from './utils/is';
import { inspect, mapEachKey } from './utils/misc';
import type { EnumValueDefinitionNode } from './graphql';
import { defineEnumValues, convertEnumValuesToConfig } from './utils/configToDefine';
import { graphqlVersion } from './utils/graphqlVersion';
import type { TypeAsString } from './TypeMapper';
import { SchemaComposer } from './SchemaComposer';
import { ListComposer } from './ListComposer';
import { NonNullComposer } from './NonNullComposer';
import type {
  ObjMap,
  ObjMapReadOnly,
  Extensions,
  Directive,
  DirectiveArgs,
} from './utils/definitions';
import { isTypeNameString } from './utils/typeHelpers';
import { printEnum, SchemaPrinterOptions } from './utils/schemaPrinter';
import { getEnumTypeDefinitionNode } from './utils/definitionNode';

export type EnumTypeComposerDefinition =
  | TypeAsString
  | EnumTypeComposerAsObjectDefinition
  | GraphQLEnumType;

export type EnumTypeComposerAsObjectDefinition = {
  name: string;
  values?: EnumTypeComposerValueConfigMapDefinition;
  description?: string | null;
  extensions?: Extensions;
  directives?: Directive[];
};

export type EnumTypeComposerValueConfig = {
  value: any /* T */;
  deprecationReason?: string | null;
  description?: string | null;
  astNode?: EnumValueDefinitionNode | null | undefined;
  extensions?: Extensions;
  directives?: Directive[];
  [key: string]: any;
};

export type EnumTypeComposerValueConfigDefinition = {
  value?: any;
  deprecationReason?: string | null;
  description?: string | null;
  extensions?: Extensions;
  directives?: Directive[];
  [key: string]: any;
};

export type EnumTypeComposerValueConfigMap = ObjMap<EnumTypeComposerValueConfig>;
export type EnumTypeComposerValueConfigMapDefinition = ObjMapReadOnly<EnumTypeComposerValueConfigDefinition>;

/**
 * `EnumTypeComposer` is a class which helps to create and modify `GraphQLEnumType`.
 */
export class EnumTypeComposer<TContext = any> {
  schemaComposer: SchemaComposer<TContext>;
  _gqType: GraphQLEnumType;
  _gqcExtensions?: Extensions;
  _gqcDirectives?: Directive[];
  _gqcIsModified?: boolean;
  _gqcFields: EnumTypeComposerValueConfigMap;

  /**
   * Create `EnumTypeComposer` with adding it by name to the `SchemaComposer`. This type became available in SDL by its name.
   */
  static create<TCtx = any>(
    typeDef: EnumTypeComposerDefinition,
    schemaComposer: SchemaComposer<TCtx>
  ): EnumTypeComposer<TCtx> {
    if (!(schemaComposer instanceof SchemaComposer)) {
      throw new Error(
        'You must provide SchemaComposer instance as a second argument for `EnumTypeComposer.create(typeDef, schemaComposer)`'
      );
    }

    if (schemaComposer.hasInstance(typeDef, EnumTypeComposer)) {
      return schemaComposer.getETC(typeDef);
    }

    const etc = this.createTemp(typeDef, schemaComposer);
    if (schemaComposer) schemaComposer.add(etc);
    return etc;
  }

  /**
   * Create `EnumTypeComposer` without adding it to the `SchemaComposer`. This method may be useful in plugins, when you need to create type temporary.
   */
  static createTemp<TCtx = any>(
    typeDef: EnumTypeComposerDefinition,
    schemaComposer?: SchemaComposer<TCtx>
  ): EnumTypeComposer<TCtx> {
    const sc = schemaComposer || new SchemaComposer();

    let ETC;

    if (isString(typeDef)) {
      const typeName: string = typeDef;
      if (isTypeNameString(typeName)) {
        ETC = new EnumTypeComposer(
          new GraphQLEnumType({
            name: typeName,
            values: graphqlVersion < 13 ? { _OldGraphqlStubValue_: {} } : {},
          }),
          sc
        );
      } else {
        ETC = sc.typeMapper.convertSDLTypeDefinition(typeName);
        if (!(ETC instanceof EnumTypeComposer)) {
          throw new Error(
            'You should provide correct GraphQLEnumType type definition. ' +
              'Eg. `enum MyType { KEY1 KEY2 KEY3 }`'
          );
        }
      }
    } else if (typeDef instanceof GraphQLEnumType) {
      ETC = new EnumTypeComposer(typeDef, sc);
    } else if (isObject(typeDef)) {
      const type = new GraphQLEnumType({
        ...(typeDef as any),
      });
      ETC = new EnumTypeComposer(type, sc);
      ETC.setFields(typeDef.values || {});
      ETC.setExtensions(typeDef.extensions);
      if (Array.isArray(typeDef?.directives)) {
        ETC.setDirectives(typeDef.directives);
      }
    } else {
      throw new Error(
        `You should provide GraphQLEnumTypeConfig or string with enum name or SDL. Provided:\n${inspect(
          typeDef
        )}`
      );
    }

    return ETC;
  }

  constructor(graphqlType: GraphQLEnumType, schemaComposer: SchemaComposer<TContext>) {
    if (!(schemaComposer instanceof SchemaComposer)) {
      throw new Error(
        'You must provide SchemaComposer instance as a second argument for `new EnumTypeComposer(GraphQLEnumType, SchemaComposer)`'
      );
    }
    if (!(graphqlType instanceof GraphQLEnumType)) {
      throw new Error('EnumTypeComposer accept only GraphQLEnumType in constructor');
    }

    this.schemaComposer = schemaComposer;
    this._gqType = graphqlType;

    // add itself to TypeStorage on create
    // it avoids recursive type use errors
    this.schemaComposer.set(graphqlType, this);
    this.schemaComposer.set(graphqlType.name, this);

    this._gqcFields = convertEnumValuesToConfig(this._gqType.getValues(), this.schemaComposer);

    if (!this._gqType.astNode) {
      this._gqType.astNode = getEnumTypeDefinitionNode(this);
    }
    this._gqcIsModified = false;
  }

  // -----------------------------------------------
  // Value methods
  // -----------------------------------------------

  /**
   * For similar naming with `ObjectTypeComposer` and `InputTypeComposer` for working with Enum values used methods with name `*field*` instead of `*value*`.
   */
  hasField(name: string): boolean {
    const values = this.getFields();
    return !!values[name];
  }

  getFields(): EnumTypeComposerValueConfigMap {
    return this._gqcFields;
  }

  getField(name: string): EnumTypeComposerValueConfig {
    const values = this.getFields();

    if (!values[name]) {
      throw new Error(
        `Cannot get value '${name}' from enum type '${this.getTypeName()}'. Value with such name does not exist.`
      );
    }

    return values[name];
  }

  getFieldNames(): string[] {
    return Object.keys(this._gqcFields);
  }

  /**
   * Completely replace all values in the type with a new set.
   */
  setFields(values: EnumTypeComposerValueConfigMapDefinition): this {
    this._gqcFields = {};
    Object.keys(values).forEach((valueName) => {
      this.setField(valueName, values[valueName]);
    });
    return this;
  }

  setField(name: string, valueConfig: EnumTypeComposerValueConfigDefinition): this {
    this._gqcFields[name] = {
      value: valueConfig.hasOwnProperty('value') ? valueConfig.value : name,
      description: valueConfig.description,
      deprecationReason: valueConfig.deprecationReason,
      extensions: valueConfig.extensions || {},
      directives: valueConfig.directives || [],
    };
    this._gqcIsModified = true;

    return this;
  }

  /**
   * Add new fields or replace existed, other fields keep untouched.
   */
  addFields(newValues: EnumTypeComposerValueConfigMapDefinition): this {
    Object.keys(newValues).forEach((valueName) => {
      this.setField(valueName, newValues[valueName]);
    });
    return this;
  }

  /**
   * Remove one value by its name, or by array of field names.
   */
  removeField(nameOrArray: string | string[]): this {
    const valueNames = Array.isArray(nameOrArray) ? nameOrArray : [nameOrArray];
    valueNames.forEach((valueName) => {
      delete this._gqcFields[valueName];
      this._gqcIsModified = true;
    });
    return this;
  }

  /**
   * Keep only provided fields in type, other fields will be removed.
   */
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
    const orderedFields = {} as EnumTypeComposerValueConfigMap;
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
    name: string,
    partialValueConfig: Partial<EnumTypeComposerValueConfigDefinition>
  ): this {
    let prevValueConfig;
    try {
      prevValueConfig = this.getField(name);
    } catch (e) {
      throw new Error(
        `Cannot extend value '${name}' from enum '${this.getTypeName()}'. Value does not exist.`
      );
    }

    this.setField(name, {
      ...prevValueConfig,
      ...partialValueConfig,
      extensions: {
        ...(prevValueConfig.extensions || {}),
        ...(partialValueConfig.extensions || {}),
      },
      directives: [...(prevValueConfig.directives || []), ...(partialValueConfig.directives || [])],
    });
    return this;
  }

  /**
   * Mark value or map of values as deprecated
   */
  deprecateFields(fields: { [fieldName: string]: string } | string[] | string): this {
    const existedFieldNames = this.getFieldNames();

    if (typeof fields === 'string') {
      if (existedFieldNames.indexOf(fields) === -1) {
        throw new Error(
          `Cannot deprecate non-existent value '${fields}' from enum '${this.getTypeName()}'`
        );
      }
      this.extendField(fields, { deprecationReason: 'deprecated' });
    } else if (Array.isArray(fields)) {
      fields.forEach((field) => {
        if (existedFieldNames.indexOf(field) === -1) {
          throw new Error(
            `Cannot deprecate non-existent value '${field}' from enum '${this.getTypeName()}'`
          );
        }
        this.extendField(field, { deprecationReason: 'deprecated' });
      });
    } else {
      const fieldMap = fields;
      Object.keys(fieldMap).forEach((field) => {
        if (existedFieldNames.indexOf(field) === -1) {
          throw new Error(
            `Cannot deprecate non-existent value '${field}' from enum '${this.getTypeName()}'`
          );
        }
        const deprecationReason: string = fieldMap[field];
        this.extendField(field, { deprecationReason });
      });
    }

    return this;
  }

  // -----------------------------------------------
  // Type methods
  // -----------------------------------------------

  getType(): GraphQLEnumType {
    const gqType = this._gqType as any;
    if (this._gqcIsModified) {
      this._gqcIsModified = false;

      gqType.astNode = getEnumTypeDefinitionNode(this);
      if (graphqlVersion >= 14) {
        gqType._values = defineEnumValues(gqType, this._gqcFields as any, gqType.astNode);
        gqType._valueLookup = new Map(
          gqType._values.map((enumValue: any) => [enumValue.value, enumValue])
        );
        gqType._nameLookup = keyMap(gqType._values, (value: any) => value.name);
      } else {
        // clear builded fields in type
        delete gqType._valueLookup;
        delete gqType._nameLookup;
        gqType._values = defineEnumValues(gqType, this._gqcFields as any, gqType.astNode);
      }
    }

    return gqType;
  }

  getTypePlural(): ListComposer<EnumTypeComposer<TContext>> {
    return new ListComposer(this);
  }

  getTypeNonNull(): NonNullComposer<EnumTypeComposer<TContext>> {
    return new NonNullComposer(this);
  }

  /**
   * Get Type wrapped in List modifier
   *
   * @example
   *   const ColorTC = schemaComposer.createEnumTC(`enum Color { RED GREEN }`);
   *   schemaComposer.Query.addFields({
   *     color1: { type: ColorTC.List },  // in SDL: color1: [Color]
   *     color2: { type: ColorTC.NonNull.List },  // in SDL: color2: [Color!]
   *     color3: { type: ColorTC.NonNull.List.NonNull },  // in SDL: color2: [Color!]!
   *   })
   */
  get List(): ListComposer<EnumTypeComposer<TContext>> {
    return new ListComposer(this);
  }

  /**
   * Get Type wrapped in NonNull modifier
   *
   * @example
   *   const ColorTC = schemaComposer.createEnumTC(`enum Color { RED GREEN }`);
   *   schemaComposer.Query.addFields({
   *     color1: { type: ColorTC.List },  // in SDL: color1: [Color]
   *     color2: { type: ColorTC.NonNull.List },  // in SDL: color2: [Color!]
   *     color3: { type: ColorTC.NonNull.List.NonNull },  // in SDL: color2: [Color!]!
   *   })
   */
  get NonNull(): NonNullComposer<EnumTypeComposer<TContext>> {
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
  clone(newTypeNameOrTC: string | EnumTypeComposer<any>): EnumTypeComposer<any> {
    if (!newTypeNameOrTC) {
      throw new Error('You should provide newTypeName:string for EnumTypeComposer.clone()');
    }

    const cloned =
      newTypeNameOrTC instanceof EnumTypeComposer
        ? newTypeNameOrTC
        : EnumTypeComposer.create(newTypeNameOrTC, this.schemaComposer);

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
   */
  cloneTo(
    anotherSchemaComposer: SchemaComposer<any>,
    cloneMap: Map<any, any> = new Map()
  ): EnumTypeComposer<any> {
    if (!anotherSchemaComposer) {
      throw new Error('You should provide SchemaComposer for EnumTypeComposer.cloneTo()');
    }

    if (cloneMap.has(this)) return cloneMap.get(this);
    const cloned = EnumTypeComposer.create(this.getTypeName(), anotherSchemaComposer);
    cloneMap.set(this, cloned);

    return this.clone(cloned);
  }

  merge(type: GraphQLEnumType | EnumTypeComposer<any>): this {
    let tc: EnumTypeComposer<any>;
    if (type instanceof GraphQLEnumType) {
      tc = EnumTypeComposer.createTemp(type, this.schemaComposer);
    } else if (type instanceof EnumTypeComposer) {
      tc = type;
    } else {
      throw new Error(
        `Cannot merge ${inspect(
          type
        )} with EnumType(${this.getTypeName()}). Provided type should be GraphQLEnumType or EnumTypeComposer.`
      );
    }

    this.addFields(tc.getFields());

    return this;
  }

  // -----------------------------------------------
  // Extensions methods
  //
  // `Extensions` is a property on type/field/arg definitions to pass private extra metadata.
  // It's used only on the server-side with the Code-First approach,
  // mostly for 3rd party server middlewares & plugins.
  // Property `extensions` may contain private server metadata of any type (even functions)
  // and does not available via SDL.
  //
  // @see https://github.com/graphql/graphql-js/issues/1527
  // @note
  //   If you need to provide public metadata to clients then use `directives` instead.
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

  // -----------------------------------------------
  // Directive methods
  //
  // Directives provide the ability to work with public metadata which is available via SDL.
  // Directives can be used on type/field/arg definitions. The most famous directives are
  // `@deprecated(reason: "...")` and `@specifiedBy(url: "...")` which are present in GraphQL spec.
  // GraphQL spec allows to you add any own directives.
  //
  // @example
  //   type Article @directive1 {
  //     name @directive2
  //     comments(limit: Int @directive3)
  //   }
  //
  // @note
  //   If you need private metadata then use `extensions` instead.
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

  /**
   * Prints SDL for current type.
   */
  toSDL(opts?: SchemaPrinterOptions): string {
    return printEnum(this.getType(), opts);
  }
}
