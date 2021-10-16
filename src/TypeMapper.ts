/* eslint-disable no-use-before-define, class-methods-use-this, no-unused-vars, no-param-reassign */

import { parse, parseType } from 'graphql/language/parser';
import { DirectiveLocationEnum, Kind, TokenKind } from 'graphql/language';
import { invariant } from './utils/misc';
import { getArgumentValues } from 'graphql/execution/values';

import type {
  DocumentNode,
  ScalarTypeDefinitionNode,
  ObjectTypeDefinitionNode,
  InterfaceTypeDefinitionNode,
  UnionTypeDefinitionNode,
  SchemaDefinitionNode,
  DirectiveDefinitionNode,
  TypeNode,
  NamedTypeNode,
  DirectiveNode,
  InputValueDefinitionNode,
  EnumTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  DefinitionNode,
  ObjectTypeExtensionNode,
  InputObjectTypeExtensionNode,
  InterfaceTypeExtensionNode,
  UnionTypeExtensionNode,
  EnumTypeExtensionNode,
  ScalarTypeExtensionNode,
  FieldDefinitionNode,
  EnumValueDefinitionNode,
  ArgumentNode,
  StringValueNode,
  Location,
} from 'graphql/language/ast';
import deprecate from './utils/deprecate';
import { inspect, keyValMap } from './utils/misc';
import {
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
  GraphQLBoolean,
  GraphQLScalarType,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLEnumType,
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLDirective,
  GraphQLDeprecatedDirective,
  GraphQLUnionType,
  valueFromAST,
  GraphQLFieldConfigArgumentMap,
} from './graphql';
import type { GraphQLType, GraphQLInputType } from './graphql';
import { GraphQLDate, GraphQLBuffer, GraphQLJSON, GraphQLJSONObject } from './type';

import type {
  InputTypeComposerFieldConfigMap,
  InputTypeComposerFieldConfigMapDefinition,
  InputTypeComposerFieldConfig,
  InputTypeComposerFieldConfigDefinition,
  InputTypeComposerFieldConfigAsObjectDefinition,
} from './InputTypeComposer';
import type {
  ObjectTypeComposerFieldConfig,
  ObjectTypeComposerFieldConfigDefinition,
  ObjectTypeComposerFieldConfigMap,
  ObjectTypeComposerFieldConfigMapDefinition,
  ObjectTypeComposerArgumentConfig,
  ObjectTypeComposerArgumentConfigDefinition,
  ObjectTypeComposerArgumentConfigMap,
  ObjectTypeComposerArgumentConfigMapDefinition,
  ObjectTypeComposerDefinition,
} from './ObjectTypeComposer';
import { ObjectTypeComposer } from './ObjectTypeComposer';
import type { SchemaComposer } from './SchemaComposer';
import { InputTypeComposer } from './InputTypeComposer';
import { ScalarTypeComposer } from './ScalarTypeComposer';
import {
  EnumTypeComposer,
  EnumTypeComposerValueConfigDefinition,
  EnumTypeComposerValueConfigMapDefinition,
} from './EnumTypeComposer';
import {
  InterfaceTypeComposer,
  InterfaceTypeComposerDefinition,
  InterfaceTypeComposerThunked,
} from './InterfaceTypeComposer';
import { UnionTypeComposer } from './UnionTypeComposer';
import { ListComposer } from './ListComposer';
import { NonNullComposer } from './NonNullComposer';
import { ThunkComposer } from './ThunkComposer';
import { Resolver } from './Resolver';
import { TypeStorage } from './TypeStorage';
import type { ThunkWithSchemaComposer, Directive } from './utils/definitions';
import { isFunction, isObject } from './utils/is';
import {
  AnyTypeComposer,
  ComposeOutputType,
  ComposeOutputTypeDefinition,
  ComposeInputType,
  ComposeInputTypeDefinition,
  NamedTypeComposer,
  isInputTypeDefinitionString,
  isTypeDefinitionString,
  isOutputTypeDefinitionString,
  isInterfaceTypeDefinitionString,
  isSomeOutputTypeComposer,
  isSomeInputTypeComposer,
  isTypeNameString,
  isEnumTypeDefinitionString,
  isScalarTypeDefinitionString,
  isUnionTypeDefinitionString,
} from './utils/typeHelpers';
import { parseValueNode } from './utils/definitionNode';
import { dedentBlockStringValue } from 'graphql/language/blockString';

/**
 * Eg. `type Name { field: Int }`
 */
export type TypeDefinitionString = string;

/**
 * Eg. `Int`, `Int!`, `[Int]`
 */
export type TypeWrappedString = string;

/**
 * Eg. `Int`, `Float`
 */
export type TypeNameString = string;

export type TypeAsString = TypeDefinitionString | TypeWrappedString | TypeNameString;

/**
 * Type storage and type generator from `Schema Definition Language` (`SDL`).
 * This is slightly rewritten [buildASTSchema](https://github.com/graphql/graphql-js/blob/master/src/utilities/buildASTSchema.js)
 * utility from `graphql-js` that allows to create type from a string (SDL).
 */
export class TypeMapper<TContext = any> {
  schemaComposer: SchemaComposer<TContext>;

  constructor(schemaComposer: SchemaComposer<TContext>) {
    if (!schemaComposer) {
      throw new Error('TypeMapper must have SchemaComposer instance.');
    }
    this.schemaComposer = schemaComposer;
  }

  /* @deprecated 8.0.0 */
  static isOutputType(type: unknown): boolean {
    deprecate("Use `import { isSomeOutputTypeComposer } from './utils/typeHelpers'` instead.");
    return isSomeOutputTypeComposer(type);
  }

  /* @deprecated 8.0.0 */
  static isInputType(type: unknown): boolean {
    deprecate("Use `import { isSomeInputTypeComposer } from './utils/typeHelpers'` instead.");
    return isSomeInputTypeComposer(type);
  }

  /* @deprecated 8.0.0 */
  static isTypeNameString(str: string): boolean {
    deprecate("Use `import { isTypeNameString } from './utils/typeHelpers'` instead.");
    return isTypeNameString(str);
  }

  /* @deprecated 8.0.0 */
  static isTypeDefinitionString(str: string): boolean {
    deprecate("Use `import { isTypeDefinitionString } from './utils/typeHelpers'` instead.");
    return isTypeDefinitionString(str);
  }

  /* @deprecated 8.0.0 */
  static isOutputTypeDefinitionString(str: string): boolean {
    deprecate("Use `import { isOutputTypeDefinitionString } from './utils/typeHelpers'` instead.");
    return isOutputTypeDefinitionString(str);
  }

  /* @deprecated 8.0.0 */
  static isInputTypeDefinitionString(str: string): boolean {
    deprecate("Use `import { isInputTypeDefinitionString } from './utils/typeHelpers'` instead.");
    return isInputTypeDefinitionString(str);
  }

  /* @deprecated 8.0.0 */
  static isEnumTypeDefinitionString(str: string): boolean {
    deprecate("Use `import { isEnumTypeDefinitionString } from './utils/typeHelpers'` instead.");
    return isEnumTypeDefinitionString(str);
  }

  /* @deprecated 8.0.0 */
  static isScalarTypeDefinitionString(str: string): boolean {
    deprecate("Use `import { isScalarTypeDefinitionString } from './utils/typeHelpers'` instead.");
    return isScalarTypeDefinitionString(str);
  }

  /* @deprecated 8.0.0 */
  static isInterfaceTypeDefinitionString(str: string): boolean {
    deprecate(
      "Use `import { isInterfaceTypeDefinitionString } from './utils/typeHelpers'` instead."
    );
    return isInterfaceTypeDefinitionString(str);
  }

  /* @deprecated 8.0.0 */
  static isUnionTypeDefinitionString(str: string): boolean {
    deprecate("Use `import { isUnionTypeDefinitionString } from './utils/typeHelpers'` instead.");
    return isUnionTypeDefinitionString(str);
  }

  convertGraphQLTypeToComposer(type: GraphQLType): AnyTypeComposer<TContext> {
    if (type instanceof GraphQLObjectType) {
      return ObjectTypeComposer.create(type, this.schemaComposer);
    } else if (type instanceof GraphQLInputObjectType) {
      return InputTypeComposer.create(type, this.schemaComposer);
    } else if (type instanceof GraphQLScalarType) {
      return ScalarTypeComposer.create(type, this.schemaComposer);
    } else if (type instanceof GraphQLEnumType) {
      return EnumTypeComposer.create(type, this.schemaComposer);
    } else if (type instanceof GraphQLInterfaceType) {
      return InterfaceTypeComposer.create(type, this.schemaComposer);
    } else if (type instanceof GraphQLUnionType) {
      return UnionTypeComposer.create(type, this.schemaComposer);
    } else if (type instanceof GraphQLNonNull) {
      // schema do not store wrapped types
      return new NonNullComposer(this.convertGraphQLTypeToComposer(type.ofType));
    } else if (type instanceof GraphQLList) {
      // schema do not store wrapped types
      return new ListComposer(this.convertGraphQLTypeToComposer(type.ofType));
    }

    throw new Error(`Cannot convert to Composer the following value: ${inspect(type)}`);
  }

  convertSDLWrappedTypeName(str: TypeWrappedString | TypeNameString): AnyTypeComposer<TContext> {
    const typeAST: TypeNode = parseType(str);
    return this.typeFromAST(typeAST);
  }

  convertSDLTypeDefinition(str: TypeDefinitionString): NamedTypeComposer<TContext> | void {
    if (this.schemaComposer.has(str)) {
      return this.schemaComposer.getAnyTC(str);
    }

    const astDocument: DocumentNode = parse(str);

    if (!astDocument || astDocument.kind !== Kind.DOCUMENT) {
      throw new Error(
        'You should provide correct type syntax. ' +
          "Eg. convertSDLTypeDefinition('type IntRange { min: Int, max: Int }')"
      );
    }

    const types = this.parseTypes(astDocument);

    const type = types[0];

    if (type) {
      this.schemaComposer.set(type.getTypeName(), type);
      // Also keep type string representation for avoiding duplicates type defs for same strings
      this.schemaComposer.set(str, type);
      return type;
    }

    return undefined;
  }

  convertOutputTypeDefinition(
    typeDef: ThunkWithSchemaComposer<
      | ComposeOutputTypeDefinition<any>
      | ObjectTypeComposerDefinition<any, any>
      | Readonly<Resolver<any, any>>,
      SchemaComposer<TContext>
    >,
    fieldName: string = '',
    typeName: string = ''
  ): ComposeOutputType<TContext> | void {
    if (typeof typeDef === 'string') {
      if (isInputTypeDefinitionString(typeDef)) {
        throw new Error(
          `Should be OutputType, but got input type definition: ${inspect(typeDef)}'`
        );
      }

      let tc;
      if (this.schemaComposer.has(typeDef)) {
        tc = this.schemaComposer.getAnyTC(typeDef);
      } else {
        tc = isTypeDefinitionString(typeDef)
          ? this.convertSDLTypeDefinition(typeDef)
          : this.convertSDLWrappedTypeName(typeDef);

        if (!tc) {
          throw new Error(`Cannot convert to OutputType the following string: ${inspect(typeDef)}`);
        }
      }
      if (!isSomeOutputTypeComposer(tc)) {
        throw new Error(`Provided incorrect OutputType: ${inspect(typeDef)}`);
      }
      return tc;
    } else if (isSomeOutputTypeComposer(typeDef)) {
      return typeDef;
    } else if (Array.isArray(typeDef)) {
      if (typeDef.length !== 1) {
        throw new Error(
          `Array must have exact one output type definition, but has ${typeDef.length}: ${inspect(
            typeDef
          )}`
        );
      }
      const tc = this.convertOutputTypeDefinition(typeDef[0], fieldName, typeName);
      if (!tc) {
        throw new Error(`Cannot construct TypeComposer from ${inspect(typeDef)}`);
      }
      return new ListComposer(tc);
    } else if (isFunction(typeDef)) {
      return new ThunkComposer(() => {
        const def = typeDef(this.schemaComposer);
        const tc = this.convertOutputFieldConfig(def as any, fieldName, typeName).type;
        if (!isSomeOutputTypeComposer(tc)) {
          throw new Error(`Provided incorrect OutputType: Function[${inspect(def)}]`);
        }
        return tc as any;
      });
    } else if (typeDef instanceof Resolver) {
      return typeDef.getTypeComposer();
    } else if (typeDef instanceof GraphQLList || typeDef instanceof GraphQLNonNull) {
      const type = this.convertGraphQLTypeToComposer(typeDef);
      if (isSomeOutputTypeComposer(type)) {
        return type;
      } else {
        throw new Error(`Provided incorrect OutputType: ${inspect(type)}`);
      }
    } else if (
      typeDef instanceof GraphQLObjectType ||
      typeDef instanceof GraphQLEnumType ||
      typeDef instanceof GraphQLInterfaceType ||
      typeDef instanceof GraphQLUnionType ||
      typeDef instanceof GraphQLScalarType
    ) {
      return this.convertGraphQLTypeToComposer(typeDef) as any;
    }

    if (typeDef instanceof InputTypeComposer) {
      throw new Error(`Should be OutputType, but provided InputTypeComposer ${inspect(typeDef)}`);
    }

    return undefined;
  }

  convertOutputFieldConfig<TSource>(
    composeFC:
      | ObjectTypeComposerFieldConfigDefinition<TSource, TContext>
      | Readonly<Resolver<any, TContext>>,
    fieldName: string = '',
    typeName: string = ''
  ): ObjectTypeComposerFieldConfig<TSource, TContext> {
    try {
      if (!composeFC) {
        throw new Error(`You provide empty output field definition: ${inspect(composeFC)}`);
      }

      if (composeFC instanceof Resolver) {
        return {
          type: composeFC.type,
          args: composeFC.getArgs(),
          resolve: composeFC.getFieldResolver(),
          description: composeFC.getDescription(),
          extensions: composeFC.extensions,
          directives: composeFC.directives || [],
          projection: composeFC.projection,
        };
      }

      // convert type when its provided as composeFC
      const tcFromFC = this.convertOutputTypeDefinition(composeFC as any, fieldName, typeName);
      if (tcFromFC) {
        return { type: tcFromFC };
      }

      // convert type when its provided in composeIFC.type
      if (isObject(composeFC)) {
        const { type, args, ...rest } = composeFC as any;
        if (!type) {
          throw new Error(
            `Definition object should contain 'type' property: ${inspect(composeFC)}`
          );
        }

        const tc = this.convertOutputTypeDefinition(type, fieldName, typeName);
        if (tc) {
          const fc = {
            type: tc,
            args: this.convertArgConfigMap(args || {}, fieldName, typeName),
            ...rest,
          } as ObjectTypeComposerFieldConfig<any, any, any>;

          const deprecatedDirectiveIdx =
            fc?.directives?.findIndex((d) => d.name === 'deprecated') ?? -1;
          if (fc.deprecationReason) {
            if (!fc.directives) fc.directives = [];
            if (deprecatedDirectiveIdx >= 0) {
              fc.directives[deprecatedDirectiveIdx].args = { reason: fc.deprecationReason };
            } else {
              fc.directives.push({ name: 'deprecated', args: { reason: fc.deprecationReason } });
            }
          } else if (deprecatedDirectiveIdx >= 0) {
            fc.deprecationReason = fc?.directives?.[deprecatedDirectiveIdx]?.args?.reason;
          }

          return fc;
        }
      }

      throw new Error(`Cannot convert to OutputType the following value: ${inspect(composeFC)}`);
    } catch (e: any) {
      e.message = `TypeError[${typeName}.${fieldName}]: ${e.message}`;
      throw e;
    }
  }

  convertOutputFieldConfigMap<TSource>(
    composeFields: ObjectTypeComposerFieldConfigMapDefinition<TSource, TContext>,
    typeName: string = ''
  ): ObjectTypeComposerFieldConfigMap<TSource, TContext> {
    const fields: ObjectTypeComposerFieldConfigMap<TSource, TContext> = {};
    Object.keys(composeFields).forEach((name) => {
      fields[name] = this.convertOutputFieldConfig(composeFields[name], name, typeName);
    });

    return fields;
  }

  convertArgConfig(
    composeAC: ObjectTypeComposerArgumentConfigDefinition,
    argName: string = '',
    fieldName: string = '',
    typeName: string = ''
  ): ObjectTypeComposerArgumentConfig {
    try {
      if (!composeAC) {
        throw new Error(`You provide empty argument config ${inspect(composeAC)}`);
      }

      // convert type when its provided as composeAC
      const tcFromAC = this.convertInputTypeDefinition(composeAC as any);
      if (tcFromAC) {
        return { type: tcFromAC };
      }

      // convert type when its provided in composeIFC.type
      if (isObject(composeAC)) {
        const { type, ...rest } = composeAC as any;
        if (!type) {
          throw new Error(
            `Definition object should contain 'type' property: ${inspect(composeAC)}'`
          );
        }

        const tc = this.convertInputTypeDefinition(type);
        if (tc) {
          const ac = {
            type: tc,
            ...rest,
          } as ObjectTypeComposerArgumentConfig;

          const deprecatedDirectiveIdx =
            ac?.directives?.findIndex((d) => d.name === 'deprecated') ?? -1;
          if (ac.deprecationReason) {
            if (!ac.directives) ac.directives = [];
            if (deprecatedDirectiveIdx >= 0) {
              ac.directives[deprecatedDirectiveIdx].args = { reason: ac.deprecationReason };
            } else {
              ac.directives.push({ name: 'deprecated', args: { reason: ac.deprecationReason } });
            }
          } else if (deprecatedDirectiveIdx >= 0) {
            ac.deprecationReason = ac?.directives?.[deprecatedDirectiveIdx]?.args?.reason;
          }

          return ac;
        }
      }

      throw new Error(`Cannot convert to InputType the following value: ${inspect(tcFromAC)}`);
    } catch (e: any) {
      e.message = `TypeError[${typeName}.${fieldName}.${argName}]: ${e.message}`;
      throw e;
    }
  }

  convertArgConfigMap(
    composeArgsConfigMap: ObjectTypeComposerArgumentConfigMapDefinition<any>,
    fieldName: string = '',
    typeName: string = ''
  ): ObjectTypeComposerArgumentConfigMap<any> {
    const argsConfigMap = {} as ObjectTypeComposerArgumentConfigMap<any>;
    if (composeArgsConfigMap) {
      Object.keys(composeArgsConfigMap).forEach((argName) => {
        argsConfigMap[argName] = this.convertArgConfig(
          composeArgsConfigMap[argName],
          argName,
          fieldName,
          typeName
        );
      });
    }

    return argsConfigMap;
  }

  convertInputTypeDefinition(
    typeDef: ThunkWithSchemaComposer<ComposeInputTypeDefinition, SchemaComposer<TContext>>,
    fieldName: string = '',
    typeName: string = ''
  ): ComposeInputType | void {
    if (typeof typeDef === 'string') {
      if (isOutputTypeDefinitionString(typeDef)) {
        throw new Error(`Should be InputType, but got output type definition: ${inspect(typeDef)}`);
      }

      let tc;
      if (this.schemaComposer.has(typeDef)) {
        tc = this.schemaComposer.getAnyTC(typeDef) as any;
      } else {
        tc = isTypeDefinitionString(typeDef)
          ? this.convertSDLTypeDefinition(typeDef)
          : this.convertSDLWrappedTypeName(typeDef);

        if (!tc) {
          throw new Error(`Cannot convert to InputType the following string: ${inspect(typeDef)}`);
        }
      }
      if (!isSomeInputTypeComposer(tc)) {
        throw new Error(`Provided incorrect InputType: ${inspect(typeDef)}`);
      }

      return tc;
    } else if (isSomeInputTypeComposer(typeDef)) {
      return typeDef;
    } else if (Array.isArray(typeDef)) {
      if (typeDef.length !== 1) {
        throw new Error(
          `Array must have exact one input type definition, but has ${typeDef.length}: ${inspect(
            typeDef
          )}`
        );
      }
      const tc = this.convertInputTypeDefinition(typeDef[0], fieldName, typeName);
      if (!tc) {
        throw new Error(`Cannot construct TypeComposer from ${inspect(typeDef)}`);
      }
      return new ListComposer(tc);
    } else if (isFunction(typeDef)) {
      return new ThunkComposer(() => {
        const def = typeDef(this.schemaComposer);
        const tc = this.convertInputFieldConfig(def, fieldName, typeName).type;
        if (!isSomeInputTypeComposer(tc)) {
          throw new Error(`Provided incorrect InputType: Function[${inspect(def)}]`);
        }
        return tc as any;
      });
    } else if (typeDef instanceof GraphQLList || typeDef instanceof GraphQLNonNull) {
      const type = this.convertGraphQLTypeToComposer(typeDef);
      if (isSomeInputTypeComposer(type)) {
        return type;
      } else {
        throw new Error(`Provided incorrect InputType: ${inspect(type)}`);
      }
    } else if (
      typeDef instanceof GraphQLInputObjectType ||
      typeDef instanceof GraphQLScalarType ||
      typeDef instanceof GraphQLEnumType
    ) {
      return this.convertGraphQLTypeToComposer(typeDef) as any;
    }

    if (typeDef instanceof ObjectTypeComposer) {
      throw new Error(`Should be InputType, but provided ObjectTypeComposer ${inspect(typeDef)}`);
    }

    return undefined;
  }

  convertInputFieldConfig(
    composeIFC: InputTypeComposerFieldConfigDefinition,
    fieldName: string = '',
    typeName: string = ''
  ): InputTypeComposerFieldConfig {
    try {
      if (!composeIFC) {
        throw new Error(`You provide empty input field definition: ${inspect(composeIFC)}`);
      }

      // convert type when its provided as composeIFC
      const tcFromIFC = this.convertInputTypeDefinition(composeIFC as any, fieldName, typeName);
      if (tcFromIFC) {
        return { type: tcFromIFC };
      }

      // convert type when its provided in composeIFC.type
      if (isObject(composeIFC)) {
        const { type, ...rest } = composeIFC as any;
        if (!type) {
          throw new Error(
            `Definition object should contain 'type' property: ${inspect(composeIFC)}`
          );
        }

        const tc = this.convertInputTypeDefinition(type, fieldName, typeName);
        if (tc) {
          const fc = {
            type: tc,
            ...rest,
          } as InputTypeComposerFieldConfig;

          const deprecatedDirectiveIdx =
            fc?.directives?.findIndex((d) => d.name === 'deprecated') ?? -1;
          if (fc.deprecationReason) {
            if (!fc.directives) fc.directives = [];
            if (deprecatedDirectiveIdx >= 0) {
              fc.directives[deprecatedDirectiveIdx].args = { reason: fc.deprecationReason };
            } else {
              fc.directives.push({ name: 'deprecated', args: { reason: fc.deprecationReason } });
            }
          } else if (deprecatedDirectiveIdx >= 0) {
            fc.deprecationReason = fc?.directives?.[deprecatedDirectiveIdx]?.args?.reason;
          }

          return fc;
        }
      }

      throw new Error(`Cannot convert to InputType the following value: ${inspect(composeIFC)}`);
    } catch (e: any) {
      e.message = `TypeError[${typeName}.${fieldName}]: ${e.message}`;
      throw e;
    }
  }

  convertInputFieldConfigMap(
    composeFields: InputTypeComposerFieldConfigMapDefinition,
    typeName: string = ''
  ): InputTypeComposerFieldConfigMap {
    const fields: InputTypeComposerFieldConfigMap = {};
    Object.keys(composeFields).forEach((name) => {
      fields[name] = this.convertInputFieldConfig(composeFields[name], name, typeName);
    });

    return fields;
  }

  convertInterfaceTypeDefinition(
    typeDef: InterfaceTypeComposerDefinition<any, TContext>
  ): InterfaceTypeComposerThunked<any, TContext> {
    if (this.schemaComposer.hasInstance(typeDef, InterfaceTypeComposer)) {
      return this.schemaComposer.getIFTC(typeDef);
    } else if (typeof typeDef === 'string') {
      const tc = isInterfaceTypeDefinitionString(typeDef)
        ? this.convertSDLTypeDefinition(typeDef)
        : this.convertSDLWrappedTypeName(typeDef);

      if (!(tc instanceof InterfaceTypeComposer) && !(tc instanceof ThunkComposer)) {
        throw new Error(
          `Cannot convert to InterfaceType the following definition: ${inspect(typeDef)}`
        );
      }
      return tc;
    } else if (typeDef instanceof GraphQLInterfaceType) {
      return new InterfaceTypeComposer(typeDef, this.schemaComposer);
    } else if (typeDef instanceof InterfaceTypeComposer || typeDef instanceof ThunkComposer) {
      return typeDef;
    } else if (isFunction(typeDef)) {
      return new ThunkComposer(
        () => this.convertInterfaceTypeDefinition(typeDef(this.schemaComposer)) as any
      );
    }

    throw new Error(
      `Cannot convert to InterfaceType the following definition: ${inspect(typeDef)}`
    );
  }

  parseTypesFromString(str: string): TypeStorage<string, NamedTypeComposer<TContext>> {
    const astDocument: DocumentNode = parse(str);

    if (!astDocument || astDocument.kind !== 'Document') {
      throw new Error('You should provide correct SDL syntax.');
    }

    const types = this.parseTypes(astDocument);
    const typeStorage = new TypeStorage();
    types.forEach((type) => {
      typeStorage.set(type.getTypeName(), type);
    });
    return typeStorage;
  }

  // -----------------------------------------------
  // Internal methods
  // -----------------------------------------------

  parseTypes(astDocument: DocumentNode): Array<NamedTypeComposer<TContext>> {
    const types = [];
    for (let i = 0; i < astDocument.definitions.length; i++) {
      const def = astDocument.definitions[i];
      const type = this.makeSchemaDef(def);
      if (type) {
        types[i] = type;
      }
    }
    return types;
  }

  typeFromAST(typeNode: TypeNode): AnyTypeComposer<TContext> {
    if (typeNode.kind === Kind.LIST_TYPE) {
      return new ListComposer(this.typeFromAST(typeNode.type));
    } else if (typeNode.kind === Kind.NON_NULL_TYPE) {
      return new NonNullComposer(this.typeFromAST(typeNode.type));
    }
    invariant(typeNode.kind === Kind.NAMED_TYPE, `Must be a named type for ${inspect(typeNode)}.`);
    const typeName = typeNode.name.value;

    if (this.schemaComposer.has(typeName)) {
      return this.schemaComposer.get(typeName);
    }

    const st = this.getBuiltInType(typeName);
    if (st) return st;

    return new ThunkComposer(() => {
      return this.schemaComposer.get(typeName);
    }, typeName);
  }

  typeFromASTInput(typeNode: TypeNode): ComposeInputType {
    const tc = this.typeFromAST(typeNode);
    if (!isSomeInputTypeComposer(tc)) {
      throw new Error(`TypeAST should be for Input types. But received ${inspect(typeNode)}`);
    }
    return tc;
  }

  typeFromASTOutput(typeNode: TypeNode): ComposeOutputType<TContext> {
    const tc = this.typeFromAST(typeNode);
    if (!isSomeOutputTypeComposer(tc)) {
      throw new Error(`TypeAST should be for Output types. But received ${inspect(typeNode)}`);
    }
    return tc;
  }

  makeSchemaDef(def: DefinitionNode): NamedTypeComposer<any> | null {
    if (!def) {
      throw new Error('def must be defined');
    }

    switch (def.kind) {
      case Kind.OBJECT_TYPE_DEFINITION:
        return this.makeTypeDef(def);
      case Kind.INTERFACE_TYPE_DEFINITION:
        return this.makeInterfaceDef(def);
      case Kind.ENUM_TYPE_DEFINITION:
        return this.makeEnumDef(def);
      case Kind.UNION_TYPE_DEFINITION:
        return this.makeUnionDef(def);
      case Kind.SCALAR_TYPE_DEFINITION:
        return this.makeScalarDef(def);
      case Kind.SCHEMA_DEFINITION:
        this.checkSchemaDef(def);
        return null;
      case Kind.DIRECTIVE_DEFINITION: {
        const directive = this.makeDirectiveDef(def);
        if (directive) this.schemaComposer.addDirective(directive);
        return null;
      }
      case Kind.INPUT_OBJECT_TYPE_DEFINITION:
        return this.makeInputObjectDef(def);
      case Kind.OBJECT_TYPE_EXTENSION:
        return this.makeExtendTypeDef(def);
      case Kind.INPUT_OBJECT_TYPE_EXTENSION:
        return this.makeExtendInputObjectDef(def);
      case Kind.INTERFACE_TYPE_EXTENSION:
        return this.makeExtendInterfaceDef(def);
      case Kind.UNION_TYPE_EXTENSION:
        return this.makeExtendUnionDef(def);
      case Kind.ENUM_TYPE_EXTENSION:
        return this.makeExtendEnumDef(def);
      case Kind.SCALAR_TYPE_EXTENSION:
        return this.makeExtendScalarDef(def);

      default:
        throw new Error(`Type kind "${def.kind}" not supported.`);
    }
  }

  makeArguments(
    values?: ReadonlyArray<InputValueDefinitionNode>
  ): ObjectTypeComposerArgumentConfigMap<any> {
    if (!values) {
      return {};
    }
    const result = {} as ObjectTypeComposerArgumentConfigMap<any>;
    values.forEach((value) => {
      const key = value.name.value;
      const typeName = this.getNamedTypeAST(value.type).name.value;
      const type = this.typeFromASTInput(value.type);

      const ac = {
        type,
        description: getDescription(value),
        directives: this.parseDirectives(value.directives),
        deprecationReason: this.getDeprecationReason(value.directives),
        astNode: value,
      } as ObjectTypeComposerArgumentConfig;

      if (value.defaultValue) {
        if (!this.schemaComposer.has(typeName) && (value?.defaultValue as any)?.value) {
          ac.defaultValue = (value.defaultValue as any).value;
        } else {
          const typeDef = this.schemaComposer.get(typeName);
          const wrappedType = this.buildWrappedTypeDef(typeDef, value.type);
          if (isSomeInputTypeComposer(wrappedType)) {
            ac.defaultValue = valueFromAST(
              value.defaultValue,
              wrappedType.getType() as GraphQLInputType
            );
          } else {
            throw new Error('Non-input type as an argument.');
          }
        }
      }

      result[key] = ac;
    });
    return result;
  }

  makeFieldDefMap(
    def:
      | ObjectTypeDefinitionNode
      | InterfaceTypeDefinitionNode
      | ObjectTypeExtensionNode
      | InterfaceTypeExtensionNode
  ): ObjectTypeComposerFieldConfigMap<any, any> {
    if (!def.fields) return {};
    return keyValMap(
      def.fields,
      (field: FieldDefinitionNode) => field.name.value,
      (field: FieldDefinitionNode) => {
        const fc: ObjectTypeComposerFieldConfig<any, any, any> = {
          type: this.typeFromASTOutput(field.type),
          description: getDescription(field),
          args: this.makeArguments(field.arguments),
          deprecationReason: this.getDeprecationReason(field.directives),
          astNode: field,
          directives: this.parseDirectives(field.directives),
        };

        return fc;
      }
    );
  }

  makeInputFieldDef(
    def: InputObjectTypeDefinitionNode | InputObjectTypeExtensionNode
  ): InputTypeComposerFieldConfigMapDefinition {
    if (!def.fields) return {};
    return keyValMap(
      def.fields,
      (field: InputValueDefinitionNode) => field.name.value,
      (field: InputValueDefinitionNode) => {
        const fc: InputTypeComposerFieldConfigAsObjectDefinition = {
          type: this.typeFromASTInput(field.type),
          description: getDescription(field),
          deprecationReason: this.getDeprecationReason(field.directives),
          astNode: field,
          directives: this.parseDirectives(field.directives),
        };
        if (field.defaultValue) {
          fc.getDefaultValueFromConstValueNode = function () {
            return valueFromAST(field.defaultValue, (fc.type as ComposeInputType).getType());
          };
        }
        return fc;
      }
    );
  }

  makeEnumDef(def: EnumTypeDefinitionNode): EnumTypeComposer<TContext> {
    const tc = this.schemaComposer.createEnumTC({
      name: def.name.value,
      description: getDescription(def),
      values: this.makeEnumValuesDef(def),
      directives: this.parseDirectives(def.directives),
      astNode: def,
    });

    return tc;
  }

  makeEnumValuesDef(
    def: EnumTypeDefinitionNode | EnumTypeExtensionNode
  ): EnumTypeComposerValueConfigMapDefinition {
    if (!def.values) return {};
    return keyValMap(
      def.values,
      (enumValue: EnumValueDefinitionNode) => enumValue.name.value,
      (enumValue: EnumValueDefinitionNode) => {
        const ec: EnumTypeComposerValueConfigDefinition = {
          description: getDescription(enumValue),
          deprecationReason: this.getDeprecationReason(enumValue.directives),
          directives: this.parseDirectives(enumValue.directives),
        };
        return ec;
      }
    );
  }

  makeInputObjectDef(def: InputObjectTypeDefinitionNode): InputTypeComposer<TContext> {
    const tc = this.schemaComposer.createInputTC({
      name: def.name.value,
      description: getDescription(def),
      fields: this.makeInputFieldDef(def),
      astNode: def,
      directives: this.parseDirectives(def.directives),
    });
    return tc;
  }

  makeDirectiveDef(def: DirectiveDefinitionNode): GraphQLDirective {
    const locations = def.locations.map(({ value }) => value) as DirectiveLocationEnum[];
    const args = {} as GraphQLFieldConfigArgumentMap;
    (def.arguments || []).forEach((value) => {
      const key = value.name.value;
      let val;
      const wrappedType = this.typeFromAST(value.type);
      if (isSomeInputTypeComposer(wrappedType)) {
        val = {
          type: wrappedType.getType(),
          description: getDescription(value),
          defaultValue: valueFromAST(value.defaultValue, wrappedType.getType() as GraphQLInputType),
        };
      } else {
        throw new Error('Non-input type as an argument.');
      }
      args[key] = val;
    });

    return new GraphQLDirective({
      name: def.name.value,
      description: getDescription(def),
      locations,
      args,
      astNode: def,
    });
  }

  getBuiltInType(name: string): ScalarTypeComposer<TContext> | undefined {
    let type: GraphQLScalarType | undefined;
    switch (name) {
      case 'String':
        type = GraphQLString;
        break;
      case 'Float':
        type = GraphQLFloat;
        break;
      case 'Int':
        type = GraphQLInt;
        break;
      case 'Boolean':
        type = GraphQLBoolean;
        break;
      case 'ID':
        type = GraphQLID;
        break;
      case 'JSON':
        type = GraphQLJSON;
        break;
      case 'JSONObject':
        type = GraphQLJSONObject;
        break;
      case 'Date':
        type = GraphQLDate;
        break;
      case 'Buffer':
        type = GraphQLBuffer;
        break;
      default:
        type = undefined;
        break;
    }

    if (type) {
      return this.schemaComposer.createScalarTC(type);
    }
    return undefined;
  }

  makeScalarDef(def: ScalarTypeDefinitionNode): ScalarTypeComposer<TContext> {
    let tc: ScalarTypeComposer<TContext> | undefined;
    const stc = this.getBuiltInType(def.name.value);
    if (stc) {
      tc = stc;
    }
    if (!tc) {
      tc = this.schemaComposer.createScalarTC({
        name: def.name.value,
        description: getDescription(def),
        serialize: (v) => v,
        astNode: def,
      });
    }
    if (def.directives) {
      tc.setDirectives(this.parseDirectives(def.directives));
    }
    return tc;
  }

  makeImplementedInterfaces(
    def:
      | ObjectTypeDefinitionNode
      | ObjectTypeExtensionNode
      | InterfaceTypeDefinitionNode
      | InterfaceTypeExtensionNode
  ): Array<InterfaceTypeComposerThunked<any, TContext>> {
    return (def.interfaces || []).map((iface) => {
      const name = this.getNamedTypeAST(iface).name.value;
      if (this.schemaComposer.hasInstance(name, InterfaceTypeComposer)) {
        return this.schemaComposer.getIFTC(name);
      } else {
        return new ThunkComposer(() => this.schemaComposer.getIFTC(name), name);
      }
    });
  }

  makeTypeDef(def: ObjectTypeDefinitionNode): ObjectTypeComposer<any, TContext> {
    const tc = this.schemaComposer.createObjectTC({
      name: def.name.value,
      description: getDescription(def),
      fields: this.makeFieldDefMap(def),
      interfaces: this.makeImplementedInterfaces(def),
      astNode: def,
      directives: this.parseDirectives(def.directives),
    });
    return tc;
  }

  makeInterfaceDef(def: InterfaceTypeDefinitionNode): InterfaceTypeComposer<any, TContext> {
    const tc = this.schemaComposer.createInterfaceTC({
      name: def.name.value,
      description: getDescription(def),
      fields: this.makeFieldDefMap(def),
      interfaces: this.makeImplementedInterfaces(def),
      astNode: def,
      directives: this.parseDirectives(def.directives),
    });
    return tc;
  }

  makeUnionDef(def: UnionTypeDefinitionNode): UnionTypeComposer<any, TContext> {
    const types = def.types;
    const tc = this.schemaComposer.createUnionTC({
      name: def.name.value,
      description: getDescription(def),
      types: (types || []).map((ref) => this.getNamedTypeAST(ref).name.value),
      astNode: def,
    });
    if (def.directives) {
      tc.setDirectives(this.parseDirectives(def.directives));
    }
    return tc;
  }

  checkSchemaDef(def: SchemaDefinitionNode): void {
    const validNames = {
      query: 'Query',
      mutation: 'Mutation',
      subscription: 'Subscription',
    };

    def.operationTypes.forEach((d) => {
      if (d.operation) {
        const validTypeName = validNames[d.operation];
        const actualTypeName = d.type.name.value;
        if (actualTypeName !== validTypeName) {
          throw new Error(
            `Incorrect type name '${actualTypeName}' for '${d.operation}'. The valid definition is "schema { ${d.operation}: ${validTypeName} }"`
          );
        }
      }
    });
  }

  getNamedTypeAST(typeAST: TypeNode): NamedTypeNode {
    let namedType = typeAST;
    while (namedType.kind === Kind.LIST_TYPE || namedType.kind === Kind.NON_NULL_TYPE) {
      namedType = namedType.type;
    }
    return namedType;
  }

  buildWrappedTypeDef(
    innerType: AnyTypeComposer<any>,
    inputTypeAST: TypeNode
  ): AnyTypeComposer<TContext> {
    if (inputTypeAST.kind === Kind.LIST_TYPE) {
      return new ListComposer(this.buildWrappedTypeDef(innerType, inputTypeAST.type));
    }
    if (inputTypeAST.kind === Kind.NON_NULL_TYPE) {
      const wrappedType = this.buildWrappedTypeDef(innerType, inputTypeAST.type);
      return new NonNullComposer(wrappedType);
    }
    return innerType;
  }

  getDeprecationReason(directives: ReadonlyArray<DirectiveNode> | undefined): string | undefined {
    const deprecatedAST = directives?.find(
      (directive) => directive.name.value === GraphQLDeprecatedDirective.name
    );
    if (!deprecatedAST) {
      return;
    }
    const { reason } = getArgumentValues(GraphQLDeprecatedDirective, deprecatedAST) as any;
    return reason;
  }

  parseDirectives(directives: ReadonlyArray<DirectiveNode> | undefined): Array<Directive> {
    const result = [] as Array<Directive>;
    if (!directives) return result;
    directives.forEach((directive) => {
      const name = directive.name.value;

      const directiveDef = this.schemaComposer._getDirective(name);
      const args = directiveDef
        ? getArgumentValues(directiveDef, directive)
        : keyValMap(
            directive.arguments || [],
            (arg: ArgumentNode) => arg.name.value,
            (arg: ArgumentNode) => parseValueNode(arg.value)
          );
      result.push({ name, args });
    });
    return result;
  }

  makeExtendTypeDef(def: ObjectTypeExtensionNode): ObjectTypeComposer<any, TContext> {
    const tc = this.schemaComposer.getOrCreateOTC(def.name.value);
    tc.addInterfaces(this.makeImplementedInterfaces(def));
    tc.addFields(this.makeFieldDefMap(def));
    if (def.directives) {
      tc.setDirectives([...tc.getDirectives(), ...this.parseDirectives(def.directives)]);
    }
    return tc;
  }

  makeExtendInputObjectDef(def: InputObjectTypeExtensionNode): InputTypeComposer<TContext> {
    const tc = this.schemaComposer.getOrCreateITC(def.name.value);
    tc.addFields(this.makeInputFieldDef(def));
    if (def.directives) {
      tc.setDirectives([...tc.getDirectives(), ...this.parseDirectives(def.directives)]);
    }
    return tc;
  }

  makeExtendInterfaceDef(def: InterfaceTypeExtensionNode): InterfaceTypeComposer<any, TContext> {
    const tc = this.schemaComposer.getOrCreateIFTC(def.name.value);
    tc.addFields(this.makeFieldDefMap(def));
    if (def.directives) {
      tc.setDirectives([...tc.getDirectives(), ...this.parseDirectives(def.directives)]);
    }
    return tc;
  }

  makeExtendUnionDef(def: UnionTypeExtensionNode): UnionTypeComposer<any, TContext> {
    const types = def.types;
    const tc = this.schemaComposer.getOrCreateUTC(def.name.value);
    tc.addTypes((types || []).map((ref) => this.getNamedTypeAST(ref).name.value));
    if (def.directives) {
      tc.setDirectives([...tc.getDirectives(), ...this.parseDirectives(def.directives)]);
    }
    return tc;
  }

  makeExtendEnumDef(def: EnumTypeExtensionNode): EnumTypeComposer<TContext> {
    const tc = this.schemaComposer.getOrCreateETC(def.name.value);
    tc.addFields(this.makeEnumValuesDef(def));
    if (def.directives) {
      tc.setDirectives([...tc.getDirectives(), ...this.parseDirectives(def.directives)]);
    }
    return tc;
  }

  makeExtendScalarDef(def: ScalarTypeExtensionNode): ScalarTypeComposer<TContext> {
    const tc = this.schemaComposer.getSTC(def.name.value);
    if (def.directives) {
      tc.setDirectives([...tc.getDirectives(), ...this.parseDirectives(def.directives)]);
    }
    return tc;
  }
}

/**
 * Given an ast node, returns its string description.
 *
 * Accepts options as a second argument:
 *
 *    - commentDescriptions:
 *        Provide true to use preceding comments as the description.
 *
 */
export function getDescription(
  node: { description?: StringValueNode; loc?: Location },
  options?: { commentDescriptions?: boolean }
): string | null | undefined {
  if (node.description) {
    return node.description.value;
  }
  if (options?.commentDescriptions === true) {
    const rawValue = getLeadingCommentBlock(node);
    if (rawValue !== undefined) {
      return dedentBlockStringValue('\n' + rawValue);
    }
  }
  return undefined;
}

function getLeadingCommentBlock(node: {
  description?: StringValueNode;
  loc?: Location;
}): string | null | undefined {
  const loc = node.loc;
  if (!loc) {
    return;
  }
  const comments = [];
  let token = loc.startToken.prev;
  while (
    token != null &&
    token.kind === TokenKind.COMMENT &&
    token.next &&
    token.prev &&
    token.line + 1 === token.next.line &&
    token.line !== token.prev.line
  ) {
    const value = String(token.value);
    comments.push(value);
    token = token.prev;
  }
  return comments.length > 0 ? comments.reverse().join('\n') : undefined;
}
