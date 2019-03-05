/* @flow strict */
/* eslint-disable no-use-before-define */

import { GraphQLScalarType, GraphQLList, GraphQLNonNull, valueFromASTUntyped } from './graphql';
import { isObject, isString } from './utils/is';
import type {
  GraphQLScalarTypeConfig,
  GraphQLScalarSerializer,
  GraphQLScalarValueParser,
  GraphQLScalarLiteralParser,
} from './graphql';
import type { TypeAsString } from './TypeMapper';
import type { SchemaComposer } from './SchemaComposer';

export type ScalarTypeComposerDefinition =
  | TypeAsString
  | GraphQLScalarTypeConfig<any, any>
  | GraphQLScalarType;

export class ScalarTypeComposer {
  gqType: GraphQLScalarType;

  static schemaComposer: SchemaComposer<any>;

  get schemaComposer(): SchemaComposer<any> {
    return this.constructor.schemaComposer;
  }

  static create(typeDef: ScalarTypeComposerDefinition): ScalarTypeComposer {
    const stc = this.createTemp(typeDef);
    this.schemaComposer.add(stc);
    return stc;
  }

  static createTemp(typeDef: ScalarTypeComposerDefinition): ScalarTypeComposer {
    if (!this.schemaComposer) {
      throw new Error('Class<ScalarTypeComposer> must be created by a SchemaComposer.');
    }

    let STC;

    if (isString(typeDef)) {
      const typeName: string = typeDef;
      const NAME_RX = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
      if (NAME_RX.test(typeName)) {
        STC = new this.schemaComposer.ScalarTypeComposer(
          new GraphQLScalarType({
            name: typeName,
            serialize: () => {},
          })
        );
      } else {
        const type = this.schemaComposer.typeMapper.createType(typeName);
        if (!(type instanceof GraphQLScalarType)) {
          throw new Error(
            'You should provide correct GraphQLScalarType type definition. Eg. `scalar UInt`'
          );
        }
        STC = new this.schemaComposer.ScalarTypeComposer(type);
      }
    } else if (typeDef instanceof GraphQLScalarType) {
      STC = new this.schemaComposer.ScalarTypeComposer(typeDef);
    } else if (isObject(typeDef)) {
      const type = new GraphQLScalarType({
        ...(typeDef: any),
      });
      STC = new this.schemaComposer.ScalarTypeComposer(type);
    } else {
      throw new Error(
        'You should provide GraphQLScalarTypeConfig or string with scalar name or SDL'
      );
    }

    return STC;
  }

  constructor(gqType: GraphQLScalarType) {
    if (!this.schemaComposer) {
      throw new Error('Class<ScalarTypeComposer> can only be created by a SchemaComposer.');
    }

    if (!(gqType instanceof GraphQLScalarType)) {
      throw new Error('ScalarTypeComposer accept only GraphQLScalarType in constructor');
    }
    this.gqType = gqType;
  }

  // -----------------------------------------------
  // Serialize methods
  // -----------------------------------------------

  setSerialize(fn: GraphQLScalarSerializer<any>) {
    this.gqType.serialize = fn;
  }

  getSerialize(): GraphQLScalarSerializer<any> {
    return this.gqType.serialize;
  }

  setParseValue(fn: ?GraphQLScalarValueParser<any>) {
    this.gqType.parseValue = fn || (value => value);
  }

  getParseValue(): GraphQLScalarValueParser<any> {
    return this.gqType.parseValue;
  }

  setParseLiteral(fn: ?GraphQLScalarLiteralParser<any>) {
    this.gqType.parseLiteral = fn || valueFromASTUntyped;
  }

  getParseLiteral(): GraphQLScalarLiteralParser<any> {
    return this.gqType.parseLiteral;
  }

  // -----------------------------------------------
  // Type methods
  // -----------------------------------------------

  getType(): GraphQLScalarType {
    return this.gqType;
  }

  getTypePlural(): GraphQLList<GraphQLScalarType> {
    return new GraphQLList(this.gqType);
  }

  getTypeNonNull(): GraphQLNonNull<GraphQLScalarType> {
    return new GraphQLNonNull(this.gqType);
  }

  getTypeName(): string {
    return this.gqType.name;
  }

  setTypeName(name: string): ScalarTypeComposer {
    this.gqType.name = name;
    this.schemaComposer.add(this);
    return this;
  }

  getDescription(): string {
    return this.gqType.description || '';
  }

  setDescription(description: string): ScalarTypeComposer {
    this.gqType.description = description;
    return this;
  }

  clone(newTypeName: string): ScalarTypeComposer {
    if (!newTypeName) {
      throw new Error('You should provide newTypeName:string for ScalarTypeComposer.clone()');
    }

    const cloned = new this.schemaComposer.ScalarTypeComposer(
      new GraphQLScalarType({
        name: newTypeName,
        serialize: this.getSerialize(),
        parseValue: this.getParseValue(),
        parseLiteral: this.getParseLiteral(),
      })
    );

    cloned.setDescription(this.getDescription());

    return cloned;
  }
}
