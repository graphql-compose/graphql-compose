import {
  GraphQLInputFieldConfig,
  GraphQLInputFieldConfigMap,
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLList,
  GraphQLInputType,
  InputValueDefinitionNode,
} from './graphql';
import { Thunk, ObjMap, Extensions } from './utils/definitions';
import { TypeAsString } from './TypeMapper';
import { SchemaComposer } from './SchemaComposer';
import { EnumTypeComposer } from './EnumTypeComposer';
import { ScalarTypeComposer } from './ScalarTypeComposer';

export type GraphQLInputObjectTypeExtended = GraphQLInputObjectType & {
  _gqcFields?: ComposeInputFieldConfigMap;
  _gqcExtensions?: Extensions;
};

export type ComposeInputFieldConfigMap = ObjMap<ComposeInputFieldConfig>;

export type ComposeInputFieldConfig =
  | ComposeInputFieldConfigAsObject
  | ComposeInputType
  | (() => ComposeInputFieldConfigAsObject | ComposeInputType);

export type ComposeInputFieldConfigAsObject = {
  type: Thunk<ComposeInputType> | GraphQLInputType;
  defaultValue?: any;
  description?: string | null;
  astNode?: InputValueDefinitionNode | null;
  extensions?: Extensions;
  [key: string]: any;
} & { $call?: void };

export type ComposeInputType =
  | InputTypeComposer
  | EnumTypeComposer
  | ScalarTypeComposer
  | GraphQLInputType
  | TypeAsString
  | Array<
      | InputTypeComposer
      | EnumTypeComposer
      | ScalarTypeComposer
      | GraphQLInputType
      | TypeAsString
    >;

export function isComposeInputType(type: any): boolean;

export type ComposeInputObjectTypeConfig = {
  name: string;
  fields: Thunk<ComposeInputFieldConfigMap>;
  description?: string | null;
  extensions?: Extensions;
};

export type InputTypeComposerDefinition =
  | TypeAsString
  | ComposeInputObjectTypeConfig
  | GraphQLInputObjectType;

export class InputTypeComposer {
  public static schemaComposer: SchemaComposer<any>;
  public schemaComposer: SchemaComposer<any>;

  public gqType: GraphQLInputObjectTypeExtended;

  public static create(typeDef: InputTypeComposerDefinition): InputTypeComposer;

  public static createTemp<TContext = any>(
    typeDef: InputTypeComposerDefinition,
    _sc?: SchemaComposer<TContext>
  ): InputTypeComposer;

  public constructor(gqType: GraphQLInputObjectType);

  // -----------------------------------------------
  // Field methods
  // -----------------------------------------------

  public getFields(): ComposeInputFieldConfigMap;

  public getFieldNames(): string[];

  public hasField(fieldName: string): boolean;

  public setFields(fields: ComposeInputFieldConfigMap): this;

  public setField(
    fieldName: string,
    fieldConfig: ComposeInputFieldConfig,
  ): this;

  /**
   * Add new fields or replace existed in a GraphQL type
   */
  public addFields(newFields: ComposeInputFieldConfigMap): this;

  /**
   * Add new fields or replace existed (where field name may have dots)
   */
  public addNestedFields(
    newFields: ComposeInputFieldConfigMap,
  ): InputTypeComposer;

  /**
   * Get fieldConfig by name
   */
  public getField(fieldName: string): ComposeInputFieldConfig;

  public removeField(fieldNameOrArray: string | string[]): this;

  public removeOtherFields(fieldNameOrArray: string | string[]): this;

  public extendField(
    fieldName: string,
    parialFieldConfig: ComposeInputFieldConfig,
  ): this;

  public reorderFields(names: string[]): this;

  public isFieldNonNull(fieldName: string): boolean;

  // alias for isFieldNonNull
  public isRequired(fieldName: string): boolean;

  public getFieldConfig(fieldName: string): GraphQLInputFieldConfig;

  public getFieldType(fieldName: string): GraphQLInputType;

  public getFieldTC(fieldName: string): InputTypeComposer;

  public makeFieldNonNull(fieldNameOrArray: string | string[]): this;

  // alias for makeFieldNonNull
  public makeRequired(fieldNameOrArray: string | string[]): this;

  public makeFieldNullable(fieldNameOrArray: string | string[]): this;

  // alias for makeFieldNullable
  public makeOptional(fieldNameOrArray: string | string[]): this;

  // -----------------------------------------------
  // Type methods
  // -----------------------------------------------

  public getType(): GraphQLInputObjectType;

  public getTypePlural(): GraphQLList<GraphQLInputObjectType>;

  public getTypeNonNull(): GraphQLNonNull<GraphQLInputObjectType>;

  public getTypeName(): string;

  public setTypeName(name: string): this;

  public getDescription(): string;

  public setDescription(description: string): this;

  public clone(newTypeName: string): InputTypeComposer;

  // -----------------------------------------------
  // Extensions methods
  // -----------------------------------------------

  public getExtensions(): Extensions;

  public setExtensions(extensions: Extensions): this;

  public extendExtensions(extensions: Extensions): this;

  public clearExtensions(): this;

  public getExtension(extensionName: string): any;

  public hasExtension(extensionName: string): boolean;

  public setExtension(extensionName: string, value: any): this;

  public removeExtension(extensionName: string): this;

  public getFieldExtensions(fieldName: string): Extensions;

  public setFieldExtensions(fieldName: string, extensions: Extensions): this;

  public extendFieldExtensions(fieldName: string, extensions: Extensions): this;

  public clearFieldExtensions(fieldName: string): this;

  public getFieldExtension(fieldName: string, extensionName: string): any;

  public hasFieldExtension(fieldName: string, extensionName: string): boolean;

  public setFieldExtension(
    fieldName: string,
    extensionName: string,
    value: any,
  ): this;

  public removeFieldExtension(fieldName: string, extensionName: string): this;

  // -----------------------------------------------
  // Misc methods
  // -----------------------------------------------

  public get(path: string | string[]): any;
}
