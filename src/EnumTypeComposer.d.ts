/* @flow strict */
/* eslint-disable no-use-before-define */

import { GraphQLEnumType, GraphQLList, GraphQLNonNull } from './graphql';
import { TypeMapper } from './TypeMapper';
import {
  GraphQLEnumValueConfig,
  GraphQLEnumTypeConfig,
  GraphQLEnumValueConfigMap,
} from './graphql';
import { SchemaComposer } from './SchemaComposer';
import { TypeAsString } from './TypeMapper';
import { Extensions } from './utils/definitions';

export type ComposeEnumTypeConfig = GraphQLEnumTypeConfig & {
  extensions?: Extensions;
};

export type EnumTypeComposerDefinition =
  | TypeAsString
  | ComposeEnumTypeConfig
  | GraphQLEnumType;

export type GraphQLEnumTypeExtended = GraphQLEnumType & {
  _gqcExtensions?: Extensions;
};

export class EnumTypeComposer {
  public static schemaComposer: SchemaComposer<any>;
  public schemaComposer: SchemaComposer<any>;

  protected gqType: GraphQLEnumTypeExtended;

  public constructor(gqType: GraphQLEnumType);

  public static create(typeDef: EnumTypeComposerDefinition): EnumTypeComposer;

  public static createTemp(
    typeDef: EnumTypeComposerDefinition,
  ): EnumTypeComposer;

  // -----------------------------------------------
  // Value methods
  // -----------------------------------------------

  public hasField(name: string): boolean;

  public getFields(): GraphQLEnumValueConfigMap;

  public getField(name: string): GraphQLEnumValueConfig;

  public getFieldNames(): string[];

  public setFields(values: GraphQLEnumValueConfigMap): this;

  public setField(name: string, valueConfig: GraphQLEnumValueConfig): this;

  public addFields(newValues: GraphQLEnumValueConfigMap): this;

  public removeField(nameOrArray: string | string[]): this;

  public removeOtherFields(fieldNameOrArray: string | string[]): this;

  public reorderFields(names: string[]): this;

  public extendField(
    name: string,
    partialValueConfig: GraphQLEnumValueConfig,
  ): this;

  public deprecateFields(
    fields: { [fieldName: string]: string } | string[] | string,
  ): this;

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

  // -----------------------------------------------
  // Type methods
  // -----------------------------------------------

  public getType(): GraphQLEnumType;

  public getTypePlural(): GraphQLList<GraphQLEnumType>;

  public getTypeNonNull(): GraphQLNonNull<GraphQLEnumType>;

  public getTypeName(): string;

  public setTypeName(name: string): this;

  public getDescription(): string;

  public setDescription(description: string): this;

  public clone(newTypeName: string): EnumTypeComposer;
}
