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
import { SchemaComposer } from './SchemaComposer';
import type { Extensions } from './utils/definitions';

export type ComposeScalarTypeConfig = GraphQLScalarTypeConfig<any, any> & {
  +extensions?: Extensions,
};

export type ScalarTypeComposerDefinition =
  | TypeAsString
  | $ReadOnly<ComposeScalarTypeConfig>
  | $ReadOnly<GraphQLScalarType>;

export type GraphQLScalarTypeExtended = GraphQLScalarType & {
  _gqcExtensions?: Extensions,
};

export class ScalarTypeComposer {
  gqType: GraphQLScalarTypeExtended;
  sc: SchemaComposer<any>;

  static create(
    typeDef: ScalarTypeComposerDefinition,
    sc: SchemaComposer<any>
  ): ScalarTypeComposer {
    if (!(sc instanceof SchemaComposer)) {
      throw new Error(
        'You must provide SchemaComposer instance as a second argument for `ScalarTypeComposer.create(typeDef, schemaComposer)`'
      );
    }
    const stc = this.createTemp(typeDef, sc);
    sc.add(stc);
    return stc;
  }

  static createTemp(
    typeDef: ScalarTypeComposerDefinition,
    _sc?: SchemaComposer<any>
  ): ScalarTypeComposer {
    const sc = _sc || new SchemaComposer();

    let STC;

    if (isString(typeDef)) {
      const typeName: string = typeDef;
      const NAME_RX = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
      if (NAME_RX.test(typeName)) {
        STC = new ScalarTypeComposer(
          new GraphQLScalarType({
            name: typeName,
            serialize: () => {},
          }),
          sc
        );
      } else {
        const type = sc.typeMapper.createType(typeName);
        if (!(type instanceof GraphQLScalarType)) {
          throw new Error(
            'You should provide correct GraphQLScalarType type definition. Eg. `scalar UInt`'
          );
        }
        STC = new ScalarTypeComposer(type, sc);
      }
    } else if (typeDef instanceof GraphQLScalarType) {
      STC = new ScalarTypeComposer(typeDef, sc);
    } else if (isObject(typeDef)) {
      const type = new GraphQLScalarType({
        ...(typeDef: any),
      });
      STC = new ScalarTypeComposer(type, sc);
      STC.gqType._gqcExtensions = (typeDef: any).extensions || {};
    } else {
      throw new Error(
        'You should provide GraphQLScalarTypeConfig or string with scalar name or SDL'
      );
    }

    return STC;
  }

  constructor(gqType: GraphQLScalarType, sc: SchemaComposer<any>) {
    if (!(sc instanceof SchemaComposer)) {
      throw new Error(
        'You must provide SchemaComposer instance as a second argument for `new ScalarTypeComposer(GraphQLScalarType, SchemaComposer)`'
      );
    }
    this.sc = sc;

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
    this.sc.add(this);
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

    const cloned = new ScalarTypeComposer(
      new GraphQLScalarType({
        name: newTypeName,
        serialize: this.getSerialize(),
        parseValue: this.getParseValue(),
        parseLiteral: this.getParseLiteral(),
      }),
      this.sc
    );

    cloned.setDescription(this.getDescription());

    return cloned;
  }

  // -----------------------------------------------
  // Extensions methods
  // -----------------------------------------------

  getExtensions(): Extensions {
    if (!this.gqType._gqcExtensions) {
      return {};
    } else {
      return this.gqType._gqcExtensions;
    }
  }

  setExtensions(extensions: Extensions): ScalarTypeComposer {
    this.gqType._gqcExtensions = extensions;
    return this;
  }

  extendExtensions(extensions: Extensions): ScalarTypeComposer {
    const current = this.getExtensions();
    this.setExtensions({
      ...current,
      ...extensions,
    });
    return this;
  }

  clearExtensions(): ScalarTypeComposer {
    this.setExtensions({});
    return this;
  }

  getExtension(extensionName: string): ?any {
    const extensions = this.getExtensions();
    return extensions[extensionName];
  }

  hasExtension(extensionName: string): boolean {
    const extensions = this.getExtensions();
    return extensionName in extensions;
  }

  setExtension(extensionName: string, value: any): ScalarTypeComposer {
    this.extendExtensions({
      [extensionName]: value,
    });
    return this;
  }

  removeExtension(extensionName: string): ScalarTypeComposer {
    const extensions = { ...this.getExtensions() };
    delete extensions[extensionName];
    this.setExtensions(extensions);
    return this;
  }
}
