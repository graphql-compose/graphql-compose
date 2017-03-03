/* @flow */
/* eslint-disable no-use-before-define, class-methods-use-this, no-unused-vars, no-param-reassign */

import objectPath from 'object-path';
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
  isOutputType,
  isInputType,
  valueFromAST,
} from 'graphql';
import { parse, parseType } from 'graphql/language/parser';
import {
  LIST_TYPE,
  NON_NULL_TYPE,
  DOCUMENT,
  SCHEMA_DEFINITION,
  SCALAR_TYPE_DEFINITION,
  OBJECT_TYPE_DEFINITION,
  INTERFACE_TYPE_DEFINITION,
  ENUM_TYPE_DEFINITION,
  UNION_TYPE_DEFINITION,
  INPUT_OBJECT_TYPE_DEFINITION,
  DIRECTIVE_DEFINITION,
  NAMED_TYPE,
} from 'graphql/language/kinds';

import { getDescription } from 'graphql/utilities/buildASTSchema';
import keyValMap from 'graphql/jsutils/keyValMap';
import invariant from 'graphql/jsutils/invariant';
import find from 'graphql/jsutils/find';
import { getArgumentValues } from 'graphql/execution/values';

import type {
  DocumentNode,
  ObjectTypeDefinitionNode,
  InterfaceTypeDefinitionNode,
  TypeNode,
  NamedTypeNode,
  DirectiveNode,
  InputValueDefinitionNode,
  EnumTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
} from 'graphql/language/ast';

import GraphQLJSON from './type/json';
import GraphQLDate from './type/date';

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
  TypeDefinitionString,
  TypeNameString,
  TypeWrappedString,
} from './definition';

import TypeComposer from './typeComposer';
import InputTypeComposer from './inputTypeComposer';
import Resolver from './resolver';

const RegexpOutputTypeDefinition = /type\s[^{]+\{[^}]+\}/im;
const RegexpInputTypeDefinition = /input\s[^{]+\{[^}]+\}/im;

class TypeMapper {
  map: Map<string, GraphQLNamedType>;

  constructor() {
    this.map = new Map();

    this.addBasicScalarTypes();
  }

  get(name: string): ?GraphQLNamedType {
    return this.map.get(name);
  }

  set(name: string, type: GraphQLNamedType) {
    this.map.set(name, type);
  }

  has(name: string): boolean {
    return this.map.has(name);
  }

  delete(name: string): boolean {
    return this.map.delete(name);
  }

  keys(): Iterator<string> {
    // eslint-disable-line no-undef
    return this.map.keys();
  }

  addBasicScalarTypes() {
    this.set('String', GraphQLString);
    this.set('Float', GraphQLFloat);
    this.set('Int', GraphQLInt);
    this.set('Boolean', GraphQLBoolean);
    this.set('ID', GraphQLID);
    this.set('JSON', GraphQLJSON);
    this.set('Json', GraphQLJSON);
    this.set('Date', GraphQLDate);
  }

  getWrapped(str: TypeWrappedString | TypeNameString): ?GraphQLType {
    const inputTypeAST: TypeNode = parseType(str);
    return typeFromAST(inputTypeAST);
  }

  createType(str: TypeDefinitionString): ?GraphQLNamedType {
    const astDocument: DocumentNode = parse(str);

    if (objectPath.get(astDocument, 'kind') !== 'Document') {
      throw new Error(
        'You should provide correct type syntax. ' +
          "Eg. createType('type IntRange { min: Int, max: Int }')"
      );
    }

    const types = parseTypes(astDocument);

    const type = types[0];

    if (type) {
      this.set(type.name, type);
      return type;
    }

    return undefined;
  }

  convertOutputFieldConfig<TSource, TContext>(
    fieldConfig: GraphQLFieldConfig<TSource, TContext>,
    fieldName: string,
    typeName: string
  ): GraphQLFieldConfig<TSource, TContext> {
    let wrapWithList = false;
    if (Array.isArray(fieldConfig)) {
      fieldConfig = {
        type: fieldConfig,
      };
    }
    if (Array.isArray(fieldConfig.type)) {
      if (fieldConfig.type.length !== 1) {
        throw new Error(
          `${typeName}.${fieldName} can accept Array exact with one output type definition`
        );
      }
      wrapWithList = true;
      fieldConfig.type = fieldConfig.type[0];
    }

    if (fieldConfig instanceof TypeComposer) {
      return { type: fieldConfig.getType() };
    }
    if (fieldConfig instanceof Resolver) {
      return fieldConfig.getFieldConfig();
    }
    if (
      fieldConfig instanceof InputTypeComposer ||
      fieldConfig.type instanceof InputTypeComposer
    ) {
      throw new Error(
        `You cannot provide InputTypeComposer to the field '${typeName}.${fieldName}'. It should be OutputType.`
      );
    }

    if (
      typeof fieldConfig === 'string' ||
      fieldConfig instanceof GraphQLScalarType ||
      fieldConfig instanceof GraphQLObjectType
    ) {
      fieldConfig = {
        type: fieldConfig,
      };
    }

    if (typeof fieldConfig.type === 'string') {
      const fieldTypeDef = fieldConfig.type;

      if (RegexpInputTypeDefinition.test(fieldTypeDef)) {
        throw new Error(
          `${typeName}.${fieldName} should be OutputType, but got input type definition '${fieldTypeDef}'`
        );
      }

      const type = RegexpOutputTypeDefinition.test(fieldTypeDef)
        ? this.createType(fieldTypeDef)
        : this.getWrapped(fieldTypeDef);

      if (!type) {
        throw new Error(
          `${typeName}.${fieldName} can not conver to OutputType following string: '${fieldTypeDef}'`
        );
      }
      // $FlowFixMe
      fieldConfig.type = type;

      if (!isOutputType(type)) {
        throw new Error(
          `${typeName}.${fieldName} provided incorrect output type '${fieldTypeDef}'`
        );
      }
    } else if (fieldConfig.type instanceof TypeComposer) {
      fieldConfig.type = fieldConfig.type.getType();
    }

    if (fieldConfig.args) {
      fieldConfig.args = this.convertArgConfigMap(
        fieldConfig.args,
        fieldName,
        typeName
      );
    }

    if (wrapWithList) {
      fieldConfig.type = new GraphQLList(fieldConfig.type);
    }

    return fieldConfig;
  }

  convertOutputFieldConfigMap<TSource, TContext>(
    fields: GraphQLFieldConfigMap<TSource, TContext>,
    typeName: string
  ): GraphQLFieldConfigMap<TSource, TContext> {
    Object.keys(fields).forEach(name => {
      fields[name] = this.convertOutputFieldConfig(
        fields[name],
        name,
        typeName
      ); // eslint-disable-line
    });

    return fields;
  }

  convertArgConfig(
    argConfig: GraphQLArgumentConfig | string,
    argName: string,
    fieldName: string,
    typeName: string
  ): GraphQLArgumentConfig {
    let wrapWithList = false;
    if (Array.isArray(argConfig)) {
      argConfig = {
        type: argConfig,
      };
    }
    // $FlowFixMe
    if (Array.isArray(argConfig.type)) {
      if (argConfig.type.length !== 1) {
        throw new Error(
          `${typeName}.${fieldName}@${argName} can accept Array exact with one input type definition`
        );
      }
      wrapWithList = true;
      // $FlowFixMe
      argConfig.type = argConfig.type[0];
    }

    if (argConfig instanceof InputTypeComposer) {
      return { type: argConfig.getType() };
    }
    if (
      argConfig instanceof TypeComposer ||
      argConfig.type instanceof TypeComposer
    ) {
      throw new Error(
        `You cannot provide TypeComposer to the arg '${typeName}.${fieldName}.@${argName}'. It should be InputType.`
      );
    }

    if (
      typeof argConfig === 'string' ||
      argConfig instanceof GraphQLScalarType ||
      argConfig instanceof GraphQLInputObjectType
    ) {
      argConfig = {
        // $FlowFixMe
        type: argConfig,
      };
    }

    if (typeof argConfig.type === 'string') {
      const argTypeDef = argConfig.type;

      if (RegexpOutputTypeDefinition.test(argTypeDef)) {
        throw new Error(
          `${typeName}.${fieldName}@${argName} should be InputType, but got output type definition '${argTypeDef}'`
        );
      }

      const type = RegexpInputTypeDefinition.test(argTypeDef)
        ? this.createType(argTypeDef)
        : this.getWrapped(argTypeDef);

      if (!isInputType(type)) {
        throw new Error(
          `${typeName}.${fieldName}@${argName} provided incorrect input type '${argTypeDef}'`
        );
      }

      // $FlowFixMe
      argConfig.type = type;
    } else if (argConfig.type instanceof InputTypeComposer) {
      argConfig.type = argConfig.type.getType();
    }

    if (wrapWithList) {
      // $FlowFixMe
      argConfig.type = new GraphQLList(argConfig.type);
    }

    return argConfig;
  }

  convertArgConfigMap(
    argsConfigMap: GraphQLFieldConfigArgumentMap,
    fieldName: string,
    typeName: string
  ): GraphQLFieldConfigArgumentMap {
    if (argsConfigMap) {
      Object.keys(argsConfigMap).forEach(argName => {
        argsConfigMap[argName] = this.convertArgConfig( // eslint-disable-line
            argsConfigMap[argName],
            argName,
            fieldName,
            typeName
          )
          ;
      });
    }

    return argsConfigMap;
  }

  convertInputFieldConfig(
    fieldConfig: GraphQLInputFieldConfig,
    fieldName: string,
    typeName: string
  ): GraphQLInputFieldConfig {
    let wrapWithList = false;
    if (Array.isArray(fieldConfig)) {
      fieldConfig = {
        type: fieldConfig,
      };
    }
    if (Array.isArray(fieldConfig.type)) {
      if (fieldConfig.type.length !== 1) {
        throw new Error(
          `${typeName}.${fieldName} can accept Array exact with one input type definition`
        );
      }
      wrapWithList = true;
      fieldConfig.type = fieldConfig.type[0];
    }

    if (fieldConfig instanceof InputTypeComposer) {
      return { type: fieldConfig.getType() };
    }
    if (
      fieldConfig instanceof TypeComposer ||
      fieldConfig.type instanceof TypeComposer
    ) {
      throw new Error(
        `You cannot provide TypeComposer to the field '${typeName}.${fieldName}'. It should be InputType.`
      );
    }

    if (
      typeof fieldConfig === 'string' ||
      fieldConfig instanceof GraphQLScalarType ||
      fieldConfig instanceof GraphQLInputObjectType
    ) {
      fieldConfig = {
        type: fieldConfig,
      };
    }

    if (typeof fieldConfig.type === 'string') {
      const fieldTypeDef = fieldConfig.type;

      if (RegexpOutputTypeDefinition.test(fieldTypeDef)) {
        throw new Error(
          `${typeName}.${fieldName} should be InputType, but got output type definition '${fieldTypeDef}'`
        );
      }

      const type = RegexpInputTypeDefinition.test(fieldTypeDef)
        ? this.createType(fieldTypeDef)
        : this.getWrapped(fieldTypeDef);

      if (!isInputType(type)) {
        throw new Error(
          `${typeName}.${fieldName} provided incorrect input type '${fieldTypeDef}'`
        );
      }

      // $FlowFixMe
      fieldConfig.type = type;
    } else if (fieldConfig.type instanceof InputTypeComposer) {
      fieldConfig.type = fieldConfig.type.getType();
    }

    if (wrapWithList) {
      // $FlowFixMe
      fieldConfig.type = new GraphQLList(fieldConfig.type);
    }

    return fieldConfig;
  }

  convertInputFieldConfigMap(
    fields: GraphQLInputFieldConfigMap,
    typeName: string
  ): GraphQLInputFieldConfigMap {
    Object.keys(fields).forEach(name => {
      fields[name] = this.convertInputFieldConfig(fields[name], name, typeName); // eslint-disable-line
    });

    return fields;
  }
}

const typeMapper = new TypeMapper();
export default typeMapper;

function parseTypes(astDocument: DocumentNode): Array<GraphQLNamedType> {
  const types = [];
  for (let i = 0; i < astDocument.definitions.length; i++) {
    const def = astDocument.definitions[i];
    types[i] = makeSchemaDef(def);
  }
  return types;
}

function typeFromAST(inputTypeAST: TypeNode): ?GraphQLType {
  let innerType;
  if (inputTypeAST.kind === LIST_TYPE) {
    innerType = typeFromAST(inputTypeAST.type);
    return innerType && new GraphQLList(innerType);
  }
  if (inputTypeAST.kind === NON_NULL_TYPE) {
    innerType = typeFromAST(inputTypeAST.type);
    return innerType &&
      new GraphQLNonNull(((innerType: any): GraphQLNullableType));
  }
  invariant(inputTypeAST.kind === NAMED_TYPE, 'Must be a named type.');
  return typeMapper.get(inputTypeAST.name.value);
}

function typeDefNamed(typeName: string): GraphQLNamedType {
  const type = typeMapper.get(typeName);
  if (type) {
    return type;
  }
  throw new Error(`Cannot find type with name '${typeName}' in TypeMapper.`);
}

function makeSchemaDef(def) {
  if (!def) {
    throw new Error('def must be defined');
  }

  switch (def.kind) {
    case OBJECT_TYPE_DEFINITION:
      return makeTypeDef(def);
    // case INTERFACE_TYPE_DEFINITION:
    //   return makeInterfaceDef(def);
    case ENUM_TYPE_DEFINITION:
      return makeEnumDef(def);
    // case UNION_TYPE_DEFINITION:
    //   return makeUnionDef(def);
    // case SCALAR_TYPE_DEFINITION:
    //   return makeScalarDef(def);
    case INPUT_OBJECT_TYPE_DEFINITION:
      return makeInputObjectDef(def);
    default:
      throw new Error(`Type kind "${def.kind}" not supported.`);
  }
}

function makeInputValues(values: Array<InputValueDefinitionNode>) {
  return keyValMap(values, value => value.name.value, value => {
    const type = produceInputType(value.type);
    return {
      type,
      description: getDescription(value),
      defaultValue: valueFromAST(value.defaultValue, type),
    };
  });
}

function makeFieldDefMap(
  def: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode
) {
  return keyValMap(def.fields, field => field.name.value, field => ({
    type: produceOutputType(field.type),
    description: getDescription(field),
    args: makeInputValues(field.arguments),
    deprecationReason: getDeprecationReason(field.directives),
  }));
}

function makeEnumDef(def: EnumTypeDefinitionNode) {
  const enumType = new GraphQLEnumType({
    name: def.name.value,
    description: getDescription(def),
    values: keyValMap(
      def.values,
      enumValue => enumValue.name.value,
      enumValue => ({
        description: getDescription(enumValue),
        deprecationReason: getDeprecationReason(enumValue.directives),
      })
    ),
  });

  return enumType;
}

function makeInputObjectDef(def: InputObjectTypeDefinitionNode) {
  return new GraphQLInputObjectType({
    name: def.name.value,
    description: getDescription(def),
    fields: () => makeInputValues(def.fields),
  });
}

function getNamedTypeAST(typeAST: TypeNode): NamedTypeNode {
  let namedType = typeAST;
  while (namedType.kind === LIST_TYPE || namedType.kind === NON_NULL_TYPE) {
    namedType = namedType.type;
  }
  return namedType;
}

function buildWrappedType(
  innerType: GraphQLType,
  inputTypeAST: TypeNode
): GraphQLType {
  if (inputTypeAST.kind === LIST_TYPE) {
    return new GraphQLList(buildWrappedType(innerType, inputTypeAST.type));
  }
  if (inputTypeAST.kind === NON_NULL_TYPE) {
    const wrappedType = buildWrappedType(innerType, inputTypeAST.type);
    invariant(!(wrappedType instanceof GraphQLNonNull), 'No nesting nonnull.');
    return new GraphQLNonNull(wrappedType);
  }
  return innerType;
}

function produceOutputType(typeAST: TypeNode): GraphQLOutputType {
  const type = produceType(typeAST);
  invariant(isOutputType(type), 'Expected Output type.');
  return (type: any);
}

function produceType(typeAST: TypeNode): GraphQLType {
  const typeName = getNamedTypeAST(typeAST).name.value;
  const typeDef = typeDefNamed(typeName);
  return buildWrappedType(typeDef, typeAST);
}

function produceInputType(typeAST: TypeNode): GraphQLInputType {
  const type = produceType(typeAST);
  invariant(isInputType(type), 'Expected Input type.');
  return (type: any);
}

function produceInterfaceType(typeAST: TypeNode): GraphQLInterfaceType {
  const type = produceType(typeAST);
  invariant(type instanceof GraphQLInterfaceType, 'Expected Object type.');
  return type;
}

function makeImplementedInterfaces(def: ObjectTypeDefinitionNode) {
  return def.interfaces &&
    def.interfaces.map(iface => produceInterfaceType(iface));
}

function makeTypeDef(def: ObjectTypeDefinitionNode) {
  const typeName = def.name.value;
  return new GraphQLObjectType({
    name: typeName,
    description: getDescription(def),
    fields: () => makeFieldDefMap(def),
    interfaces: () => makeImplementedInterfaces(def),
  });
}

function getDeprecationReason(directives: ?Array<DirectiveNode>): ?string {
  const deprecatedAST = directives &&
    find(
      directives,
      directive => directive.name.value === GraphQLDeprecatedDirective.name
    );
  if (!deprecatedAST) {
    return;
  }
  const { reason } = getArgumentValues(
    GraphQLDeprecatedDirective,
    deprecatedAST
  );
  return (reason: any); // eslint-disable-line
}
