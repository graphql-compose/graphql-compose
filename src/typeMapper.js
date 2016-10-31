/* @flow */
/* eslint-disable no-use-before-define */

import objectPath from 'object-path';
import GraphQLJSON from './type/json';
import {
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
  GraphQLBoolean,
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
import {
  parse,
  parseType,
} from 'graphql/language/parser';
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
  GraphQLType,
  GraphQLNamedType,
  GraphQLOutputType,
  GraphQLInputType,
  GraphQLNullableType,
  GraphQLFieldConfigMap,
  GraphQLFieldConfig,
  GraphQLFieldConfigArgumentMap,
  GraphQLArgumentConfig,
  InputObjectConfigFieldMap,
  InputObjectFieldConfig,
} from './definition';

import TypeComposer from './typeComposer';
import InputTypeComposer from './inputTypeComposer';
import Resolver from './resolver';

import type {
  Document,
  ObjectTypeDefinition,
  InterfaceTypeDefinition,
  Type,
  NamedType,
  Directive,
  InputValueDefinition,
  EnumTypeDefinition,
  InputObjectTypeDefinition,
} from 'graphql/language/ast';


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
  }

  getWrapped(str: string): ?GraphQLType {
    const inputTypeAST: Type = parseType(str);
    return typeFromAST(inputTypeAST);
  }

  createType(str: string): ?GraphQLNamedType {
    const astDocument: Document = parse(str);

    if (objectPath.get(astDocument, 'kind') !== 'Document') {
      throw new Error('You should provide correct type syntax. '
                    + 'Eg. createType(\'type IntRange { min: Int, max: Int }\')');
    }

    const types = parseTypes(astDocument);

    const type = types[0];

    if (type) {
      this.set(type.name, type);
      return type;
    }

    return undefined;
  }

  convertOutputFieldConfig(
    fieldConfig: GraphQLFieldConfig,
    fieldName: string,
    typeName: string
  ): GraphQLFieldConfig {
    let type;
    let args;

    if (fieldConfig instanceof TypeComposer) {
      return { type: fieldConfig.getType() };
    }
    if (fieldConfig instanceof Resolver) {
      return fieldConfig.getFieldConfig();
    }
    if (fieldConfig instanceof InputTypeComposer
      || fieldConfig.type instanceof InputTypeComposer) {
      throw new Error(`You cannot provide InputTypeComposer to the field '${typeName}.${fieldName}'. It should be OutputType.`);
    }

    if (typeof fieldConfig === 'string') {
      fieldConfig = { // eslint-disable-line no-param-reassign
        type: fieldConfig,
      };
    }

    if (typeof fieldConfig.type === 'string') {
      const fieldTypeName = fieldConfig.type;
      type = this.getWrapped(fieldTypeName);
      if (!isOutputType(type)) {
        throw new Error(`${typeName}.${fieldName} provided incorrect output type '${fieldTypeName}'`);
      }
    } else if (fieldConfig.type instanceof TypeComposer) {
      type = fieldConfig.type.getType();
    } else {
      type = fieldConfig.type;
    }

    if (fieldConfig.args) {
      args = this.convertArgConfigMap(fieldConfig.args, fieldName, typeName);
    }

    // For performance reason
    // return new object only of type or args is converted
    if (type || (args && args !== fieldConfig.args)) {
      return {
        ...fieldConfig,
        // $FlowFixMe
        type: type || fieldConfig.type,
        args: args || fieldConfig.args,
      };
    }

    return fieldConfig;
  }

  convertOutputFieldConfigMap(
    fields: GraphQLFieldConfigMap,
    typeName: string
  ): GraphQLFieldConfigMap {
    Object.keys(fields).forEach((name) => {
      fields[name] = this.convertOutputFieldConfig(fields[name], name, typeName); // eslint-disable-line
    });

    return fields;
  }

  convertArgConfig(
    argConfig: GraphQLArgumentConfig | string,
    argName: string,
    fieldName: string,
    typeName: string
  ): GraphQLArgumentConfig {
    if (argConfig instanceof InputTypeComposer) {
      return { type: argConfig.getType() };
    }
    if (argConfig instanceof TypeComposer
      || argConfig.type instanceof TypeComposer) {
      throw new Error(`You cannot provide TypeComposer to the arg '${typeName}.${fieldName}.@${argName}'. It should be InputType.`);
    }

    if (typeof argConfig === 'string') {
      argConfig = { // eslint-disable-line no-param-reassign
        // $FlowFixMe
        type: argConfig,
      };
    }

    if (typeof argConfig.type === 'string') {
      const argTypeName = argConfig.type;
      const type = this.getWrapped(argTypeName);
      if (!isInputType(type)) {
        throw new Error(`${typeName}.${fieldName}@${argName} provided incorrect input type '${argTypeName}'`);
      }

      return {
        ...argConfig,
        // $FlowFixMe
        type,
      };
    } else if (argConfig.type instanceof InputTypeComposer) {
      return {
        ...argConfig,
        type: argConfig.type.getType(),
      };
    }

    return argConfig;
  }

  convertArgConfigMap(
    argsConfigMap: GraphQLFieldConfigArgumentMap,
    fieldName: string,
    typeName: string
  ): GraphQLFieldConfigArgumentMap {
    if (argsConfigMap) {
      Object.keys(argsConfigMap).forEach((argName) => {
        argsConfigMap[argName] = this.convertArgConfig( // eslint-disable-line
          argsConfigMap[argName],
          argName,
          fieldName,
          typeName,
        );
      });
    }

    return argsConfigMap;
  }

  convertInputFieldConfig(
    fieldConfig: InputObjectFieldConfig,
    fieldName: string,
    typeName: string
  ): InputObjectFieldConfig {
    if (fieldConfig instanceof InputTypeComposer) {
      return { type: fieldConfig.getType() };
    }
    if (fieldConfig instanceof TypeComposer
      || fieldConfig.type instanceof TypeComposer) {
      throw new Error(`You cannot provide TypeComposer to the field '${typeName}.${fieldName}'. It should be InputType.`);
    }

    if (typeof fieldConfig === 'string') {
      fieldConfig = { // eslint-disable-line no-param-reassign
        type: fieldConfig,
      };
    }


    if (typeof fieldConfig.type === 'string') {
      const fieldTypeName = fieldConfig.type;
      const type = this.getWrapped(fieldTypeName);
      if (!isInputType(type)) {
        throw new Error(`${typeName}.${fieldName} provided incorrect input type '${fieldTypeName}'`);
      }

      return {
        ...fieldConfig,
        // $FlowFixMe
        type,
      };
    } else if (fieldConfig.type instanceof InputTypeComposer) {
      return {
        ...fieldConfig,
        type: fieldConfig.type.getType(),
      };
    }

    return fieldConfig;
  }

  convertInputFieldConfigMap(
    fields: InputObjectConfigFieldMap,
    typeName: string
  ): InputObjectConfigFieldMap {
    Object.keys(fields).forEach((name) => {
      fields[name] = this.convertInputFieldConfig(fields[name], name, typeName); // eslint-disable-line
    });

    return fields;
  }
}

const typeMapper = new TypeMapper();
export default typeMapper;

function parseTypes(astDocument: Document): Array<GraphQLNamedType> {
  const types = [];
  for (let i = 0; i < astDocument.definitions.length; i++) {
    const def = astDocument.definitions[i];
    types[i] = makeSchemaDef(def);
  }
  return types;
}

function typeFromAST(inputTypeAST: Type): ?GraphQLType {
  let innerType;
  if (inputTypeAST.kind === LIST_TYPE) {
    innerType = typeFromAST(inputTypeAST.type);
    return innerType && new GraphQLList(innerType);
  }
  if (inputTypeAST.kind === NON_NULL_TYPE) {
    innerType = typeFromAST(inputTypeAST.type);
    return innerType && new GraphQLNonNull(
      ((innerType: any): GraphQLNullableType)
    );
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

function makeInputValues(values: Array<InputValueDefinition>) {
  return keyValMap(
    values,
    value => value.name.value,
    (value) => {
      const type = produceInputType(value.type);
      return {
        type,
        description: getDescription(value),
        defaultValue: valueFromAST(value.defaultValue, type),
      };
    }
  );
}

function makeFieldDefMap(
  def: ObjectTypeDefinition | InterfaceTypeDefinition
) {
  return keyValMap(
    def.fields,
    field => field.name.value,
    field => ({
      type: produceOutputType(field.type),
      description: getDescription(field),
      args: makeInputValues(field.arguments),
      deprecationReason: getDeprecationReason(field.directives),
    })
  );
}

function makeEnumDef(def: EnumTypeDefinition) {
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

function makeInputObjectDef(def: InputObjectTypeDefinition) {
  return new GraphQLInputObjectType({
    name: def.name.value,
    description: getDescription(def),
    fields: () => makeInputValues(def.fields),
  });
}

function getNamedTypeAST(typeAST: Type): NamedType {
  let namedType = typeAST;
  while (namedType.kind === LIST_TYPE || namedType.kind === NON_NULL_TYPE) {
    namedType = namedType.type;
  }
  return namedType;
}

function buildWrappedType(
  innerType: GraphQLType,
  inputTypeAST: Type
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

function produceOutputType(typeAST: Type): GraphQLOutputType {
  const type = produceType(typeAST);
  invariant(isOutputType(type), 'Expected Output type.');
  return (type: any);
}

function produceType(typeAST: Type): GraphQLType {
  const typeName = getNamedTypeAST(typeAST).name.value;
  const typeDef = typeDefNamed(typeName);
  return buildWrappedType(typeDef, typeAST);
}

function produceInputType(typeAST: Type): GraphQLInputType {
  const type = produceType(typeAST);
  invariant(isInputType(type), 'Expected Input type.');
  return (type: any);
}

function produceInterfaceType(typeAST: Type): GraphQLInterfaceType {
  const type = produceType(typeAST);
  invariant(type instanceof GraphQLInterfaceType, 'Expected Object type.');
  return type;
}

function makeImplementedInterfaces(def: ObjectTypeDefinition) {
  return def.interfaces &&
    def.interfaces.map(iface => produceInterfaceType(iface));
}

function makeTypeDef(def: ObjectTypeDefinition) {
  const typeName = def.name.value;
  return new GraphQLObjectType({
    name: typeName,
    description: getDescription(def),
    fields: () => makeFieldDefMap(def),
    interfaces: () => makeImplementedInterfaces(def),
  });
}

function getDeprecationReason(directives: ?Array<Directive>): ?string {
  const deprecatedAST = directives && find(
    directives,
    directive => directive.name.value === GraphQLDeprecatedDirective.name
  );
  if (!deprecatedAST) {
    return;
  }
  const { reason } = getArgumentValues(
    GraphQLDeprecatedDirective.args,
    deprecatedAST.arguments
  );
  return (reason: any);
}
