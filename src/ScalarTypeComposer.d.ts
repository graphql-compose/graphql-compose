/* @flow strict */
/* eslint-disable no-use-before-define */

import {
  GraphQLScalarType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarTypeConfig,
  GraphQLScalarSerializer,
  GraphQLScalarValueParser,
  GraphQLScalarLiteralParser,
} from './graphql';
import { TypeMapper } from './TypeMapper';
import { SchemaComposer } from './SchemaComposer';
import { TypeAsString } from './TypeMapper';

export type ScalarTypeComposerDefinition =
  | TypeAsString
  | GraphQLScalarTypeConfig<any, any>
  | GraphQLScalarType;

export class ScalarTypeComposer {
  public static schemaComposer: SchemaComposer<any>;
  public schemaComposer: SchemaComposer<any>;

  protected gqType: GraphQLScalarType;

  public constructor(gqType: GraphQLScalarType);

  public static create(
    typeDef: ScalarTypeComposerDefinition,
  ): ScalarTypeComposer;

  public static createTemp(
    typeDef: ScalarTypeComposerDefinition,
  ): ScalarTypeComposer;

  // -----------------------------------------------
  // Serialize methods
  // -----------------------------------------------

  public setSerialize(fn: GraphQLScalarSerializer<any>): void;

  public getSerialize(): GraphQLScalarSerializer<any>;

  public setParseValue(fn: GraphQLScalarValueParser<any> | void): void;

  public getParseValue(): GraphQLScalarValueParser<any>;

  public setParseLiteral(fn: GraphQLScalarLiteralParser<any> | void): void;

  public getParseLiteral(): GraphQLScalarLiteralParser<any>;

  // -----------------------------------------------
  // Type methods
  // -----------------------------------------------

  public getType(): GraphQLScalarType;

  public getTypePlural(): GraphQLList<GraphQLScalarType>;

  public getTypeNonNull(): GraphQLNonNull<GraphQLScalarType>;

  public getTypeName(): string;

  public setTypeName(name: string): this;

  public getDescription(): string;

  public setDescription(description: string): this;

  public clone(newTypeName: string): ScalarTypeComposer;
}
