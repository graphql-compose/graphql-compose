/* @flow strict */
/* eslint-disable no-use-before-define */

import { GraphQLEnumType, GraphQLList, GraphQLNonNull } from './graphql';
import { isObject, isString } from './utils/is';
import { TypeMapper } from './TypeMapper';
import {
  GraphQLEnumValueConfig,
  GraphQLEnumTypeConfig,
  GraphQLEnumValueConfigMap,
} from './graphql';
import { TypeAsString } from './TypeMapper';

export type GraphQLEnumTypeExtended = GraphQLEnumType & {
  _gqcEnumTypeComposer?: EnumTypeComposer,
};

export class EnumTypeComposer {
  public gqType: GraphQLEnumType;

  public constructor(gqType: GraphQLEnumType);

  public static create(opts: TypeAsString | GraphQLEnumTypeConfig | GraphQLEnumType): EnumTypeComposer;

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

  public extendField(name: string, partialValueConfig: GraphQLEnumValueConfig): this;

  public getType(): GraphQLEnumType;

  public getTypePlural(): GraphQLList<GraphQLEnumType>;

  public getTypeNonNull(): GraphQLNonNull<GraphQLEnumType>;

  public getTypeName(): string;

  public setTypeName(name: string): this;

  public getDescription(): string;

  public setDescription(description: string): this;

  public deprecateFields(fields: { [fieldName: string]: string } | string[] | string): this;

  public clone(newTypeName: string): EnumTypeComposer;
}
