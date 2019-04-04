/* @flow strict */
/* eslint-disable no-use-before-define, class-methods-use-this, no-unused-vars, no-param-reassign */

import { parse, parseType } from 'graphql/language/parser';
import { Kind } from 'graphql/language';
import { getDescription } from 'graphql/utilities/buildASTSchema';
import keyValMap from 'graphql/jsutils/keyValMap';
import invariant from 'graphql/jsutils/invariant';
import { getArgumentValues, getDirectiveValues } from 'graphql/execution/values';
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
} from 'graphql/language/ast';
import { inspect } from './utils/misc';
import find from './utils/polyfills/find';
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
  GraphQLSkipDirective,
  GraphQLIncludeDirective,
  GraphQLDeprecatedDirective,
  GraphQLUnionType,
  isNamedType,
  isScalarType,
  valueFromAST,
} from './graphql';
import type {
  GraphQLType,
  GraphQLNamedType,
  GraphQLOutputType,
  GraphQLInputType,
  GraphQLNullableType,
  GraphQLFieldConfigMap,
  GraphQLFieldConfig,
  GraphQLFieldConfigArgumentMap,
  GraphQLArgumentConfig,
  GraphQLInputFieldConfigMap,
  GraphQLInputFieldConfig,
} from './graphql';
import GraphQLJSON from './type/json';
import GraphQLDate from './type/date';
import GraphQLBuffer from './type/buffer';

import type { ComposeInputFieldConfigMap, ComposeInputFieldConfig } from './InputTypeComposer';
import type {
  ComposeOutputType,
  ComposeFieldConfigMap,
  ComposeFieldConfig,
  ComposeArgumentConfig,
  ComposeFieldConfigArgumentMap,
} from './ObjectTypeComposer';
import { ObjectTypeComposer } from './ObjectTypeComposer';
import type { SchemaComposer, AnyComposeType, AnyType } from './SchemaComposer';
import { InputTypeComposer } from './InputTypeComposer';
import { ScalarTypeComposer } from './ScalarTypeComposer';
import { EnumTypeComposer } from './EnumTypeComposer';
import { InterfaceTypeComposer } from './InterfaceTypeComposer';
import { UnionTypeComposer } from './UnionTypeComposer';
import { Resolver } from './Resolver';
import { TypeStorage } from './TypeStorage';
import type { Thunk } from './utils/definitions';
import { isFunction, isObject } from './utils/is';
import DefaultDirective from './directive/default';

export type TypeDefinitionString = string; // eg type Name { field: Int }
export type TypeWrappedString = string; // eg. Int, Int!, [Int]
export type TypeNameString = string; // eg. Int, Float
export type TypeAsString = TypeDefinitionString | TypeWrappedString | TypeNameString;
export type ComposeObjectType =
  | ObjectTypeComposer<any, any>
  | GraphQLObjectType
  | TypeDefinitionString
  | TypeAsString;

// solve Flow reqursion limit, do not import from graphql.js
function isOutputType(type: any): boolean {
  return (
    type instanceof GraphQLScalarType ||
    type instanceof GraphQLObjectType ||
    type instanceof GraphQLInterfaceType ||
    type instanceof GraphQLUnionType ||
    type instanceof GraphQLEnumType ||
    (type instanceof GraphQLNonNull && isOutputType(type.ofType)) ||
    (type instanceof GraphQLList && isOutputType(type.ofType))
  );
}

// solve Flow reqursion limit, do not import from graphql.js
function isInputType(type: any): boolean {
  return (
    type instanceof GraphQLScalarType ||
    type instanceof GraphQLEnumType ||
    type instanceof GraphQLInputObjectType ||
    (type instanceof GraphQLNonNull && isInputType(type.ofType)) ||
    (type instanceof GraphQLList && isInputType(type.ofType))
  );
}

const RegexpOutputTypeDefinition = /type\s[^{]+\{[^}]+\}/im;
const RegexpInputTypeDefinition = /input\s[^{]+\{[^}]+\}/im;
const RegexpEnumTypeDefinition = /enum\s[^{]+\{[^}]+\}/im;
const RegexpScalarTypeDefinition = /scalar\s/im;

export class TypeMapper<TContext> {
  schemaComposer: SchemaComposer<TContext>;

  constructor(schemaComposer: SchemaComposer<TContext>): TypeMapper<TContext> {
    if (!schemaComposer) {
      throw new Error('TypeMapper must have SchemaComposer instance.');
    }
    this.schemaComposer = schemaComposer;

    // alive proper Flow type casting in autosuggestions for class with Generics
    /* :: return this; */
  }

  basicScalars: Map<string, GraphQLNamedType> = new Map([
    // graphql basic types
    ['String', GraphQLString],
    ['Float', GraphQLFloat],
    ['Int', GraphQLInt],
    ['Boolean', GraphQLBoolean],
    ['ID', GraphQLID],
  ]);

  get(name: string): GraphQLNamedType | void {
    const basicScalar = this.basicScalars.get(name);
    if (basicScalar) return basicScalar;

    if (!this.schemaComposer.has(name)) {
      if (name === 'JSON' || name === 'Json') {
        this.schemaComposer.set(name, GraphQLJSON);
        return GraphQLJSON;
      } else if (name === 'Date') {
        this.schemaComposer.set(name, GraphQLDate);
        return GraphQLDate;
      } else if (name === 'Buffer') {
        this.schemaComposer.set(name, GraphQLBuffer);
        return GraphQLBuffer;
      } else {
        return undefined;
      }
    }

    const schemaType = this.schemaComposer.get(name);
    if (isNamedType(schemaType) || isScalarType(schemaType)) {
      return schemaType;
    }
    return schemaType.getType();
  }

  set(name: string, type: AnyType<any>): void {
    this.schemaComposer.set(name, type);
  }

  has(name: string): boolean {
    return this.schemaComposer.has(name);
  }

  getWrapped(str: TypeWrappedString | TypeNameString): GraphQLType | void {
    const typeAST: TypeNode = parseType(str);
    return typeFromAST(typeAST, this.schemaComposer);
  }

  createType(str: TypeDefinitionString): AnyComposeType<TContext> | void {
    if (this.has(str)) {
      return this.schemaComposer.getAnyTC(str);
    }

    const astDocument: DocumentNode = parse(str);

    if (!astDocument || astDocument.kind !== 'Document') {
      throw new Error(
        'You should provide correct type syntax. ' +
          "Eg. createType('type IntRange { min: Int, max: Int }')"
      );
    }

    const types = parseTypes(astDocument, this.schemaComposer);

    const type = types[0];

    if (type) {
      this.set(type.getTypeName(), type);
      // Also keep type string representation for avoiding duplicates type defs for same strings
      this.set(str, type);
      return type;
    }

    return undefined;
  }

  createGraphQLType(str: TypeDefinitionString): GraphQLType | void {
    const type = this.createType(str);
    if (type) {
      return type.getType();
    }

    return undefined;
  }

  parseTypesFromString(str: string): TypeStorage<string, AnyComposeType<TContext>> {
    const astDocument: DocumentNode = parse(str);

    if (!astDocument || astDocument.kind !== 'Document') {
      throw new Error('You should provide correct SDL syntax.');
    }

    const types = parseTypes(astDocument, this.schemaComposer);
    const typeStorage = new TypeStorage();
    types.forEach(type => {
      typeStorage.set(type.getTypeName(), type);
    });
    return typeStorage;
  }

  convertOutputType(composeType: ComposeObjectType): GraphQLObjectType {
    if (this.schemaComposer.hasInstance(composeType, ObjectTypeComposer)) {
      return this.schemaComposer.getOTC(composeType).getType();
    } else if (typeof composeType === 'string') {
      const type = RegexpOutputTypeDefinition.test(composeType)
        ? this.createGraphQLType(composeType)
        : this.getWrapped(composeType);

      if (!type) {
        throw new Error(`Cannot convert to OutputType the following string: '${composeType}'`);
      }

      if (!(type instanceof GraphQLObjectType)) {
        throw new Error(`Cannot convert to OutputType the following object: '${inspect(type)}'`);
      }

      return type;
    } else if (composeType instanceof GraphQLObjectType) {
      return composeType;
    } else if (composeType instanceof ObjectTypeComposer) {
      return composeType.getType();
    }

    throw new Error(`Cannot convert to OutputType the following object: '${inspect(composeType)}'`);
  }

  convertOutputFieldConfig<TSource>(
    composeFC: ComposeFieldConfig<TSource, TContext>,
    fieldName?: string = '',
    typeName?: string = ''
  ): GraphQLFieldConfig<TSource, TContext> {
    invariant(composeFC, `You provide empty argument field config for ${typeName}.${fieldName}`);

    let composeType;
    let copyProps;
    let copyArgs;

    if (composeFC instanceof GraphQLList || composeFC instanceof GraphQLNonNull) {
      return { type: composeFC };
    } else if (isFunction(composeFC)) {
      return (composeFC: any);
    } else if (composeFC instanceof Resolver) {
      return composeFC.getFieldConfig();
    } else if (
      composeFC instanceof ObjectTypeComposer ||
      composeFC instanceof EnumTypeComposer ||
      composeFC instanceof InterfaceTypeComposer ||
      composeFC instanceof UnionTypeComposer ||
      composeFC instanceof ScalarTypeComposer
    ) {
      return {
        type: composeFC.getType(),
        description: composeFC.getDescription(),
      };
    } else if (Array.isArray(composeFC)) {
      composeType = composeFC;
    } else if (composeFC.type) {
      const { type, args, ...rest } = (composeFC: any);
      composeType = type;
      copyProps = rest;
      copyArgs = args;
    } else {
      composeType = composeFC;
    }

    let wrapWithList = 0;
    while (Array.isArray(composeType)) {
      if (composeType.length !== 1) {
        throw new Error(
          `${typeName}.${fieldName} can accept Array exact with one output type definition`
        );
      }
      wrapWithList += 1;
      composeType = composeType[0];
    }

    if (composeType instanceof InputTypeComposer) {
      throw new Error(
        `You cannot provide InputTypeComposer to the field '${typeName}.${fieldName}'. It should be OutputType.`
      );
    }

    const fieldConfig: GraphQLFieldConfig<any, TContext> = ({}: any);
    if (typeof composeType === 'string') {
      if (RegexpInputTypeDefinition.test(composeType)) {
        throw new Error(
          `${typeName}.${fieldName} should be OutputType, but got following type definition '${composeType}'`
        );
      }

      if (this.schemaComposer.hasInstance(composeType, ObjectTypeComposer)) {
        fieldConfig.type = this.schemaComposer.getOTC(composeType).getType();
      } else {
        const type =
          RegexpOutputTypeDefinition.test(composeType) ||
          RegexpEnumTypeDefinition.test(composeType) ||
          RegexpScalarTypeDefinition.test(composeType)
            ? this.createGraphQLType(composeType)
            : this.getWrapped(composeType);

        if (!type) {
          throw new Error(
            `${typeName}.${fieldName} cannot convert to OutputType the following string: '${composeType}'`
          );
        }
        fieldConfig.type = (type: any);
      }
    } else if (
      composeType instanceof ObjectTypeComposer ||
      composeType instanceof EnumTypeComposer ||
      composeType instanceof InterfaceTypeComposer ||
      composeType instanceof UnionTypeComposer ||
      composeType instanceof ScalarTypeComposer
    ) {
      fieldConfig.type = composeType.getType();
    } else if (composeType instanceof Resolver) {
      fieldConfig.type = composeType.getType();
    } else {
      fieldConfig.type = (composeType: any);
    }

    if (!fieldConfig.type) {
      throw new Error(`${typeName}.${fieldName} must have some 'type'`);
    }

    if (!isFunction(fieldConfig.type)) {
      if (!isOutputType(fieldConfig.type)) {
        throw new Error(
          `${typeName}.${fieldName} provided incorrect OutputType: '${JSON.stringify(composeType)}'`
        );
      }

      if (wrapWithList > 0) {
        for (let i = 0; i < wrapWithList; i++) {
          fieldConfig.type = new GraphQLList((fieldConfig.type: any));
        }
      }
    }

    if (copyArgs) {
      const args: GraphQLFieldConfigArgumentMap = this.convertArgConfigMap(
        copyArgs,
        fieldName,
        typeName
      );
      fieldConfig.args = args;
    }

    if (isObject(copyProps)) {
      // copy all other props
      for (const prop in copyProps) {
        if (copyProps.hasOwnProperty(prop)) {
          fieldConfig[prop] = copyProps[prop];
        }
      }
    }

    return fieldConfig;
  }

  convertOutputFieldConfigMap<TSource>(
    composeFields: ComposeFieldConfigMap<TSource, TContext>,
    typeName?: string = ''
  ): GraphQLFieldConfigMap<TSource, TContext> {
    const fields: GraphQLFieldConfigMap<TSource, TContext> = ({}: any);
    Object.keys(composeFields).forEach(name => {
      fields[name] = this.convertOutputFieldConfig(composeFields[name], name, typeName);
    });

    return fields;
  }

  convertArgConfig(
    composeAC: ComposeArgumentConfig,
    argName?: string = '',
    fieldName?: string = '',
    typeName?: string = ''
  ): GraphQLArgumentConfig {
    invariant(
      composeAC,
      `You provide empty argument config for ${typeName}.${fieldName}.${argName}`
    );

    let composeType;
    let copyProps;

    if (composeAC instanceof GraphQLList || composeAC instanceof GraphQLNonNull) {
      return { type: composeAC };
    } else if (
      composeAC instanceof InputTypeComposer ||
      composeAC instanceof EnumTypeComposer ||
      composeAC instanceof ScalarTypeComposer
    ) {
      return {
        type: composeAC.getType(),
        description: composeAC.getDescription(),
      };
    } else if (Array.isArray(composeAC)) {
      composeType = composeAC;
    } else if (isFunction(composeAC)) {
      return (composeAC: any);
    } else if (composeAC.type) {
      const { type, ...rest } = (composeAC: any);
      composeType = type;
      copyProps = rest;
    } else {
      composeType = composeAC;
    }

    let wrapWithList = 0;
    while (Array.isArray(composeType)) {
      if (composeType.length !== 1) {
        throw new Error(
          `${typeName}.${fieldName}@${argName} can accept Array exact with one input type definition`
        );
      }
      wrapWithList += 1;
      composeType = composeType[0];
    }

    if (composeType instanceof ObjectTypeComposer) {
      throw new Error(
        `You cannot provide ObjectTypeComposer to the arg '${typeName}.${fieldName}.@${argName}'. It should be InputType.`
      );
    }

    const argConfig: GraphQLArgumentConfig = ({}: any);
    if (typeof composeType === 'string') {
      if (RegexpOutputTypeDefinition.test(composeType)) {
        throw new Error(
          `${typeName}.${fieldName}@${argName} should be InputType, but got output type definition '${composeType}'`
        );
      }

      if (this.schemaComposer.hasInstance(composeType, InputTypeComposer)) {
        argConfig.type = this.schemaComposer.getITC(composeType).getType();
      } else {
        const type =
          RegexpInputTypeDefinition.test(composeType) ||
          RegexpEnumTypeDefinition.test(composeType) ||
          RegexpScalarTypeDefinition.test(composeType)
            ? this.createGraphQLType(composeType)
            : this.getWrapped(composeType);

        if (!type) {
          throw new Error(
            `${typeName}.${fieldName}@${argName} cannot convert to InputType the following string: '${composeType}'`
          );
        }

        argConfig.type = (type: any);
      }
    } else if (
      composeType instanceof InputTypeComposer ||
      composeType instanceof EnumTypeComposer ||
      composeType instanceof ScalarTypeComposer
    ) {
      argConfig.type = composeType.getType();
    } else {
      argConfig.type = (composeType: any);
    }

    if (!argConfig.type) {
      throw new Error(`${typeName}.${fieldName}@${argName} must have some 'type'`);
    }

    if (!isFunction(argConfig.type)) {
      if (!isInputType(argConfig.type)) {
        throw new Error(
          `${typeName}.${fieldName}@${argName} provided incorrect InputType: '${JSON.stringify(
            composeType
          )}'`
        );
      }

      if (wrapWithList > 0) {
        for (let i = 0; i < wrapWithList; i++) {
          argConfig.type = new GraphQLList((argConfig.type: any));
        }
      }
    }

    if (isObject(copyProps)) {
      // copy all other props
      for (const prop in copyProps) {
        if (copyProps.hasOwnProperty(prop)) {
          argConfig[prop] = copyProps[prop];
        }
      }
    }

    return argConfig;
  }

  convertArgConfigMap(
    composeArgsConfigMap: ComposeFieldConfigArgumentMap<any>,
    fieldName?: string = '',
    typeName?: string = ''
  ): GraphQLFieldConfigArgumentMap {
    const argsConfigMap = {};
    if (composeArgsConfigMap) {
      Object.keys(composeArgsConfigMap).forEach(argName => {
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

  convertInputFieldConfig(
    composeIFC: ComposeInputFieldConfig,
    fieldName?: string = '',
    typeName?: string = ''
  ): GraphQLInputFieldConfig {
    invariant(composeIFC, `You provide empty input field config for ${typeName}.${fieldName}`);

    let composeType;
    let copyProps;

    if (composeIFC instanceof GraphQLList || composeIFC instanceof GraphQLNonNull) {
      return { type: composeIFC };
    } else if (
      composeIFC instanceof InputTypeComposer ||
      composeIFC instanceof EnumTypeComposer ||
      composeIFC instanceof ScalarTypeComposer
    ) {
      return {
        type: composeIFC.getType(),
        description: composeIFC.getDescription(),
      };
    } else if (Array.isArray(composeIFC)) {
      composeType = composeIFC;
    } else if (isFunction(composeIFC)) {
      return (composeIFC: any);
    } else if (composeIFC.type) {
      const { type, ...rest } = (composeIFC: any);
      composeType = composeIFC.type;
      copyProps = rest;
    } else {
      composeType = composeIFC;
    }

    let wrapWithList = 0;
    while (Array.isArray(composeType)) {
      if (composeType.length !== 1) {
        throw new Error(
          `${typeName}.${fieldName} can accept Array exact with one input type definition`
        );
      }
      wrapWithList += 1;
      composeType = composeType[0];
    }

    if (composeType instanceof ObjectTypeComposer) {
      throw new Error(
        `You cannot provide ObjectTypeComposer to the field '${typeName}.${fieldName}'. It should be InputType.`
      );
    }

    const fieldConfig: GraphQLInputFieldConfig = ({}: any);
    if (typeof composeType === 'string') {
      if (RegexpOutputTypeDefinition.test(composeType)) {
        throw new Error(
          `${typeName}.${fieldName} should be InputType, but got output type definition '${composeType}'`
        );
      }

      if (this.schemaComposer.hasInstance(composeType, InputTypeComposer)) {
        fieldConfig.type = this.schemaComposer.getITC(composeType).getType();
      } else {
        const type =
          RegexpInputTypeDefinition.test(composeType) ||
          RegexpEnumTypeDefinition.test(composeType) ||
          RegexpScalarTypeDefinition.test(composeType)
            ? this.createGraphQLType(composeType)
            : this.getWrapped(composeType);

        if (!type) {
          throw new Error(
            `${typeName}.${fieldName} cannot convert to InputType the following string: '${composeType}'`
          );
        }

        fieldConfig.type = (type: any);
      }
    } else if (
      composeType instanceof InputTypeComposer ||
      composeType instanceof EnumTypeComposer ||
      composeType instanceof ScalarTypeComposer
    ) {
      fieldConfig.type = composeType.getType();
    } else {
      fieldConfig.type = (composeType: any);
    }

    if (!fieldConfig.type) {
      throw new Error(`${typeName}.${fieldName} must have some 'type'`);
    }

    if (!isFunction(fieldConfig.type)) {
      if (!isInputType(fieldConfig.type)) {
        throw new Error(
          `${typeName}.${fieldName} provided incorrect InputType: '${inspect(composeType)}'`
        );
      }

      if (wrapWithList > 0) {
        for (let i = 0; i < wrapWithList; i++) {
          fieldConfig.type = new GraphQLList((fieldConfig.type: any));
        }
      }
    }

    if (isObject(copyProps)) {
      // copy all other props
      for (const prop in copyProps) {
        if (copyProps.hasOwnProperty(prop)) {
          fieldConfig[prop] = copyProps[prop];
        }
      }
    }

    return fieldConfig;
  }

  convertInputFieldConfigMap(
    composeFields: ComposeInputFieldConfigMap,
    typeName?: string = ''
  ): GraphQLInputFieldConfigMap {
    const fields: GraphQLInputFieldConfigMap = ({}: any);
    Object.keys(composeFields).forEach(name => {
      fields[name] = this.convertInputFieldConfig(composeFields[name], name, typeName);
    });

    return fields;
  }
}

// /////////////////////////////////////////////////////////////////////////////
// From GraphQL-js particles
// /////////////////////////////////////////////////////////////////////////////
function parseTypes<TContext>(
  astDocument: DocumentNode,
  schema: SchemaComposer<any>
): Array<AnyComposeType<TContext>> {
  const types = [];
  for (let i = 0; i < astDocument.definitions.length; i++) {
    const def = astDocument.definitions[i];
    const type = makeSchemaDef(def, schema);
    if (type) {
      types[i] = type;
    }
  }
  return types;
}

function typeFromAST(inputTypeAST: TypeNode, schema: SchemaComposer<any>): GraphQLType | void {
  let innerType;
  if (inputTypeAST.kind === Kind.LIST_TYPE) {
    innerType = typeFromAST(inputTypeAST.type, schema);
    return innerType && new GraphQLList(innerType);
  }
  if (inputTypeAST.kind === Kind.NON_NULL_TYPE) {
    innerType = typeFromAST(inputTypeAST.type, schema);
    return innerType && new GraphQLNonNull(((innerType: any): GraphQLNullableType));
  }
  invariant(inputTypeAST.kind === Kind.NAMED_TYPE, 'Must be a named type.');
  return schema.typeMapper.get(inputTypeAST.name.value);
}

function typeDefNamed(typeName: string, schema: SchemaComposer<any>): GraphQLNamedType {
  const type = schema.typeMapper.get(typeName);
  if (type && isNamedType(type)) {
    return type;
  } else if (type) {
    return type.getType();
  }
  if (typeName === 'Query') {
    return schema.Query.getType();
  }
  if (typeName === 'Mutation') {
    return schema.Mutation.getType();
  }
  if (typeName === 'Subscription') {
    return schema.Subscription.getType();
  }
  throw new Error(`Cannot find type with name '${typeName}' in SchemaComposer.`);
}

function makeSchemaDef(def, schema: SchemaComposer<any>): AnyComposeType<any> | null {
  if (!def) {
    throw new Error('def must be defined');
  }

  switch (def.kind) {
    case Kind.OBJECT_TYPE_DEFINITION:
      return makeTypeDef(def, schema);
    case Kind.INTERFACE_TYPE_DEFINITION:
      return makeInterfaceDef(def, schema);
    case Kind.ENUM_TYPE_DEFINITION:
      return makeEnumDef(def, schema);
    case Kind.UNION_TYPE_DEFINITION:
      return makeUnionDef(def, schema);
    case Kind.SCALAR_TYPE_DEFINITION:
      return makeScalarDef(def, schema);
    case Kind.SCHEMA_DEFINITION:
      checkSchemaDef(def);
      return null;
    case Kind.DIRECTIVE_DEFINITION: {
      const directive = makeDirectiveDef(def, schema);
      if (directive) schema.addDirective(directive);
      return null;
    }
    case Kind.INPUT_OBJECT_TYPE_DEFINITION:
      return makeInputObjectDef(def, schema);
    default:
      throw new Error(`Type kind "${def.kind}" not supported.`);
  }
}

function getInputDefaultValue(value: InputValueDefinitionNode, type: GraphQLInputType): mixed {
  // check getDirectiveValues become avaliable from 0.10.2
  if (Array.isArray(value.directives) && getDirectiveValues) {
    const vars = getDirectiveValues(DefaultDirective, value);
    if (vars && vars.hasOwnProperty('value')) return vars.value;
  }
  return valueFromAST(value.defaultValue, type);
}

function makeArguments(
  values: ?$ReadOnlyArray<InputValueDefinitionNode>,
  schema: SchemaComposer<any>
): ComposeFieldConfigArgumentMap<any> {
  if (!values) {
    return {};
  }
  const result = {};
  values.forEach(value => {
    const key = value.name.value;
    let val;
    const typeName = getNamedTypeAST(value.type).name.value;
    const type = produceType(value.type, schema);
    if (value.defaultValue) {
      const typeDef = typeDefNamed(typeName, schema);
      val = () => {
        const wrappedType = buildWrappedTypeDef(typeDef, value.type);
        if (isInputType(wrappedType)) {
          return {
            type,
            description: getDescription(value),
            defaultValue: getInputDefaultValue(value, ((wrappedType: any): GraphQLInputType)),
          };
        } else {
          throw new Error('Non-input type as an argument.');
        }
      };
    } else {
      val = {
        type,
        description: getDescription(value),
      };
    }
    result[key] = val;
  });
  return result;
}

function makeFieldDefMap(
  def: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode,
  schema: SchemaComposer<any>
): ComposeFieldConfigMap<any, any> {
  if (!def.fields) return {};
  return keyValMap(
    def.fields,
    field => field.name.value,
    field => ({
      type: produceType(field.type, schema),
      description: getDescription(field),
      args: makeArguments(field.arguments, schema),
      deprecationReason: getDeprecationReason(field.directives),
      astNode: field,
    })
  );
}

function makeInputFieldDef(
  def: InputObjectTypeDefinitionNode,
  schema: SchemaComposer<any>
): ComposeInputFieldConfigMap {
  if (!def.fields) return {};
  return keyValMap(
    def.fields,
    field => field.name.value,
    field => {
      let defaultValue;
      if (Array.isArray(field.directives) && getDirectiveValues) {
        const vars = getDirectiveValues(DefaultDirective, field);
        if (vars && vars.hasOwnProperty('value')) {
          defaultValue = vars.value;
        }
      }
      return {
        type: produceType(field.type, schema),
        description: getDescription(field),
        deprecationReason: getDeprecationReason(field.directives),
        defaultValue,
        astNode: field,
      };
    }
  );
}

function makeEnumDef(def: EnumTypeDefinitionNode, schema: SchemaComposer<any>) {
  const enumType = EnumTypeComposer.createTemp(
    {
      name: def.name.value,
      description: getDescription(def),
      values: !def.values
        ? {}
        : keyValMap(
            def.values,
            enumValue => enumValue.name.value,
            enumValue => ({
              description: getDescription(enumValue),
              deprecationReason: getDeprecationReason(enumValue.directives),
            })
          ),
      astNode: def,
    },
    schema
  );

  return enumType;
}

function makeInputObjectDef(def: InputObjectTypeDefinitionNode, schema: SchemaComposer<any>) {
  return InputTypeComposer.createTemp(
    {
      name: def.name.value,
      description: getDescription(def),
      fields: makeInputFieldDef(def, schema),
      astNode: def,
    },
    schema
  );
}

function makeDirectiveDef(
  def: DirectiveDefinitionNode,
  schema: SchemaComposer<any>
): GraphQLDirective {
  const locations = def.locations.map(({ value }) => (value: any));
  const args = {};
  (def.arguments || []).forEach(value => {
    const key = value.name.value;
    let val;
    const typeName = getNamedTypeAST(value.type).name.value;
    const typeDef = typeDefNamed(typeName, schema);
    const wrappedType = buildWrappedTypeDef(typeDef, value.type);
    if (isInputType(wrappedType)) {
      val = {
        type: wrappedType,
        description: getDescription(value),
        defaultValue: getInputDefaultValue(value, ((wrappedType: any): GraphQLInputType)),
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

function makeScalarDef(def: ScalarTypeDefinitionNode, schema: SchemaComposer<any>) {
  return ScalarTypeComposer.createTemp(
    {
      name: def.name.value,
      description: getDescription(def),
      serialize: v => v,
      astNode: def,
    },
    schema
  );
}

function checkSchemaDef(def: SchemaDefinitionNode) {
  const validNames = {
    query: 'Query',
    mutation: 'Mutation',
    subscription: 'Subscription',
  };

  def.operationTypes.forEach(d => {
    if (d.operation) {
      const validTypeName = validNames[d.operation];
      const actualTypeName = d.type.name.value;
      if (actualTypeName !== validTypeName) {
        throw new Error(
          `Incorrect type name '${actualTypeName}' for '${
            d.operation
          }'. The valid definition is "schema { ${d.operation}: ${validTypeName} }"`
        );
      }
    }
  });
}

function getNamedTypeAST(typeAST: TypeNode): NamedTypeNode {
  let namedType = typeAST;
  while (namedType.kind === Kind.LIST_TYPE || namedType.kind === Kind.NON_NULL_TYPE) {
    namedType = namedType.type;
  }
  return namedType;
}

function buildWrappedType(innerType: string | GraphQLType, inputTypeAST: TypeNode): string {
  if (inputTypeAST.kind === Kind.LIST_TYPE) {
    const wrappedType = buildWrappedType(innerType, inputTypeAST.type);
    return `[${wrappedType}]`;
  }
  if (inputTypeAST.kind === Kind.NON_NULL_TYPE) {
    const wrappedType = buildWrappedType(innerType, inputTypeAST.type);
    return `${wrappedType}!`;
  }
  return innerType.toString();
}

function buildWrappedTypeDef(innerType: GraphQLType, inputTypeAST: TypeNode): GraphQLType {
  if (inputTypeAST.kind === Kind.LIST_TYPE) {
    return new GraphQLList(buildWrappedTypeDef(innerType, inputTypeAST.type));
  }
  if (inputTypeAST.kind === Kind.NON_NULL_TYPE) {
    const wrappedType = buildWrappedTypeDef(innerType, inputTypeAST.type);
    invariant(!(wrappedType instanceof GraphQLNonNull), 'No nesting nonnull.');
    return new GraphQLNonNull(wrappedType);
  }
  return innerType;
}

function produceType(typeAST: TypeNode, schema: SchemaComposer<any>): string {
  const typeName = getNamedTypeAST(typeAST).name.value;
  return buildWrappedType(typeName, typeAST);
}

function makeImplementedInterfaces(def: ObjectTypeDefinitionNode, schema: SchemaComposer<any>) {
  return (def.interfaces || []).map(iface => {
    const name = getNamedTypeAST(iface).name.value;
    return schema.getIFTC(name).getType();
  });
}

function makeTypeDef(def: ObjectTypeDefinitionNode, schema: SchemaComposer<any>) {
  return ObjectTypeComposer.createTemp(
    {
      name: def.name.value,
      description: getDescription(def),
      fields: makeFieldDefMap(def, schema),
      interfaces: () => makeImplementedInterfaces(def, schema),
      astNode: def,
    },
    schema
  );
}

function makeInterfaceDef(def: InterfaceTypeDefinitionNode, schema: SchemaComposer<any>) {
  return InterfaceTypeComposer.createTemp(
    {
      name: def.name.value,
      description: getDescription(def),
      fields: makeFieldDefMap(def, schema),
      astNode: def,
    },
    schema
  );
}

function makeUnionDef(def: UnionTypeDefinitionNode, schema: SchemaComposer<any>) {
  const types: ?$ReadOnlyArray<NamedTypeNode> = def.types;
  return UnionTypeComposer.createTemp(
    {
      name: def.name.value,
      description: getDescription(def),
      types: (types || []).map(ref => getNamedTypeAST(ref).name.value),
      astNode: def,
    },
    schema
  );
}

function getDeprecationReason(directives: ?$ReadOnlyArray<DirectiveNode>): ?string {
  const deprecatedAST =
    directives &&
    find(directives, directive => directive.name.value === GraphQLDeprecatedDirective.name);
  if (!deprecatedAST) {
    return;
  }
  const { reason } = getArgumentValues(GraphQLDeprecatedDirective, deprecatedAST);
  return (reason: any); // eslint-disable-line
}
