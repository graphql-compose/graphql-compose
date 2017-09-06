/* @flow */
/* eslint-disable no-use-before-define, class-methods-use-this, no-unused-vars, no-param-reassign */

import objectPath from 'object-path';
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
  // isOutputType,
  // isInputType,
  valueFromAST,
} from './graphql';

import GraphQLJSON from './type/json';
import GraphQLDate from './type/date';
import { isFunction, isObject } from './utils/is';
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
import type { ComposeInputFieldConfigMap, ComposeInputFieldConfig } from './inputTypeComposer';
import type {
  ComposeOutputType,
  ComposeFieldConfigMap,
  ComposeFieldConfig,
  ComposeArgumentConfig,
  ComposeFieldConfigArgumentMap,
} from './typeComposer';

import TypeComposer from './typeComposer';
import InputTypeComposer from './inputTypeComposer';
import Resolver from './resolver';

export type TypeDefinitionString = string;
export type TypeWrappedString = string; // eg. Int, Int!, [Int]
export type TypeNameString = string; // eg. Int, Float

export function isOutputType(type: ?GraphQLType): boolean {
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

export function isInputType(type: ?GraphQLType): boolean {
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
    composeFC: ComposeFieldConfig<TSource, TContext>,
    fieldName?: string = '',
    typeName?: string = ''
  ): GraphQLFieldConfig<TSource, TContext> {
    let composeType;

    if (composeFC instanceof GraphQLList || composeFC instanceof GraphQLNonNull) {
      return { type: composeFC };
    } else if (composeFC instanceof Resolver) {
      return composeFC.getFieldConfig();
    } else if (composeFC instanceof TypeComposer) {
      return {
        type: composeFC.getType(),
        description: composeFC.getDescription(),
      };
    } else if (Array.isArray(composeFC)) {
      composeType = composeFC;
      composeFC = {};
    } else if (isFunction(composeFC)) {
      return composeFC;
    } else if (composeFC.type) {
      composeType = composeFC.type;
    } else {
      composeType = composeFC;
      composeFC = {};
    }

    let wrapWithList = false;
    if (Array.isArray(composeType)) {
      if (composeType.length !== 1) {
        throw new Error(
          `${typeName}.${fieldName} can accept Array exact with one output type definition`
        );
      }
      wrapWithList = true;
      composeType = composeType[0];

      if (Array.isArray(composeType)) {
        throw new Error(
          `${typeName}.${fieldName} definition [[Type]] (array of array) does not supported`
        );
      }
    }

    if (composeType instanceof InputTypeComposer) {
      throw new Error(
        `You cannot provide InputTypeComposer to the field '${typeName}.${fieldName}'. It should be OutputType.`
      );
    }

    const fieldConfig = {};
    if (typeof composeType === 'string') {
      if (RegexpInputTypeDefinition.test(composeType)) {
        throw new Error(
          `${typeName}.${fieldName} should be OutputType, but got input type definition '${composeType}'`
        );
      }

      const type =
        RegexpOutputTypeDefinition.test(composeType) || RegexpEnumTypeDefinition.test(composeType)
          ? this.createType(composeType)
          : this.getWrapped(composeType);

      if (!type) {
        throw new Error(
          `${typeName}.${fieldName} cannot convert to OutputType the following string: '${composeType}'`
        );
      }

      // $FlowFixMe
      fieldConfig.type = type;
    } else if (composeType instanceof TypeComposer) {
      fieldConfig.type = composeType.getType();
    } else if (composeType instanceof Resolver) {
      fieldConfig.type = composeType.getType();
    } else {
      fieldConfig.type = composeType;
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

      if (wrapWithList) {
        fieldConfig.type = new GraphQLList((fieldConfig.type: any));
      }
    }

    if (isObject(composeFC)) {
      if (composeFC.args) {
        fieldConfig.args = this.convertArgConfigMap((composeFC.args: any), fieldName, typeName);
      }

      // copy all other props
      const doNotCopy = ['type', 'args'];
      for (const prop in composeFC) {
        if (composeFC.hasOwnProperty(prop) && doNotCopy.indexOf(prop) === -1) {
          fieldConfig[prop] = composeFC[prop];
        }
      }
    }

    return fieldConfig;
  }

  convertOutputFieldConfigMap<TSource, TContext>(
    composeFields: ComposeFieldConfigMap<TSource, TContext>,
    typeName?: string = ''
  ): GraphQLFieldConfigMap<TSource, TContext> {
    const fields = {};
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
    let composeType;

    if (composeAC instanceof GraphQLList || composeAC instanceof GraphQLNonNull) {
      return { type: composeAC };
    } else if (composeAC instanceof InputTypeComposer) {
      return {
        type: composeAC.getType(),
        description: composeAC.getDescription(),
      };
    } else if (Array.isArray(composeAC)) {
      composeType = composeAC;
      composeAC = {};
    } else if (isFunction(composeAC)) {
      return composeAC;
    } else if (composeAC.type) {
      composeType = composeAC.type;
    } else {
      composeType = composeAC;
      composeAC = {};
    }

    let wrapWithList = false;
    if (Array.isArray(composeType)) {
      if (composeType.length !== 1) {
        throw new Error(
          `${typeName}.${fieldName}@${argName} can accept Array exact with one input type definition`
        );
      }
      wrapWithList = true;
      composeType = composeType[0];

      if (Array.isArray(composeType)) {
        throw new Error(
          `${typeName}.${fieldName}@${argName} definition [[Type]] (array of array) does not supported`
        );
      }
    }

    if (composeType instanceof TypeComposer) {
      throw new Error(
        `You cannot provide TypeComposer to the arg '${typeName}.${fieldName}.@${argName}'. It should be InputType.`
      );
    }

    const argConfig = {};
    if (typeof composeType === 'string') {
      if (RegexpOutputTypeDefinition.test(composeType)) {
        throw new Error(
          `${typeName}.${fieldName}@${argName} should be InputType, but got output type definition '${composeType}'`
        );
      }

      const type =
        RegexpInputTypeDefinition.test(composeType) || RegexpEnumTypeDefinition.test(composeType)
          ? this.createType(composeType)
          : this.getWrapped(composeType);

      if (!type) {
        throw new Error(
          `${typeName}.${fieldName}@${argName} cannot convert to InputType the following string: '${composeType}'`
        );
      }

      // $FlowFixMe
      argConfig.type = type;
    } else if (composeType instanceof InputTypeComposer) {
      argConfig.type = composeType.getType();
    } else {
      argConfig.type = composeType;
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

      if (wrapWithList) {
        argConfig.type = new GraphQLList((argConfig.type: any));
      }
    }

    if (isObject(composeAC)) {
      // copy all other props
      const doNotCopy = ['type'];
      for (const prop in composeAC) {
        if (composeAC.hasOwnProperty(prop) && doNotCopy.indexOf(prop) === -1) {
          argConfig[prop] = composeAC[prop];
        }
      }
    }

    return argConfig;
  }

  convertArgConfigMap(
    composeArgsConfigMap: ComposeFieldConfigArgumentMap,
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
    let composeType;

    if (composeIFC instanceof GraphQLList || composeIFC instanceof GraphQLNonNull) {
      return { type: composeIFC };
    } else if (composeIFC instanceof InputTypeComposer) {
      return {
        type: composeIFC.getType(),
        description: composeIFC.getDescription(),
      };
    } else if (Array.isArray(composeIFC)) {
      composeType = composeIFC;
      composeIFC = {};
    } else if (isFunction(composeIFC)) {
      return composeIFC;
    } else if (composeIFC.type) {
      composeType = composeIFC.type;
    } else {
      composeType = composeIFC;
      composeIFC = {};
    }

    let wrapWithList = false;
    if (Array.isArray(composeType)) {
      if (composeType.length !== 1) {
        throw new Error(
          `${typeName}.${fieldName} can accept Array exact with one input type definition`
        );
      }
      wrapWithList = true;
      composeType = composeType[0];

      if (Array.isArray(composeType)) {
        throw new Error(
          `${typeName}.${fieldName} definition [[Type]] (array of array) does not supported`
        );
      }
    }

    if (composeType instanceof TypeComposer) {
      throw new Error(
        `You cannot provide TypeComposer to the field '${typeName}.${fieldName}'. It should be InputType.`
      );
    }

    const fieldConfig = {};
    if (typeof composeType === 'string') {
      if (RegexpOutputTypeDefinition.test(composeType)) {
        throw new Error(
          `${typeName}.${fieldName} should be InputType, but got output type definition '${composeType}'`
        );
      }

      const type =
        RegexpInputTypeDefinition.test(composeType) || RegexpEnumTypeDefinition.test(composeType)
          ? this.createType(composeType)
          : this.getWrapped(composeType);

      if (!type) {
        throw new Error(
          `${typeName}.${fieldName} cannot convert to InputType the following string: '${composeType}'`
        );
      }

      // $FlowFixMe
      fieldConfig.type = type;
    } else if (composeType instanceof InputTypeComposer) {
      fieldConfig.type = composeType.getType();
    } else {
      fieldConfig.type = composeType;
    }

    if (!fieldConfig.type) {
      throw new Error(`${typeName}.${fieldName} must have some 'type'`);
    }

    if (!isFunction(fieldConfig.type)) {
      if (!isInputType(fieldConfig.type)) {
        throw new Error(
          `${typeName}.${fieldName} provided incorrect InputType: '${JSON.stringify(composeType)}'`
        );
      }

      if (wrapWithList) {
        fieldConfig.type = new GraphQLList((fieldConfig.type: any));
      }
    }

    if (isObject(composeIFC)) {
      // copy all other props
      const doNotCopy = ['type'];
      for (const prop in composeIFC) {
        if (composeIFC.hasOwnProperty(prop) && doNotCopy.indexOf(prop) === -1) {
          fieldConfig[prop] = composeIFC[prop];
        }
      }
    }

    return (fieldConfig: GraphQLInputFieldConfig);
  }

  convertInputFieldConfigMap(
    composeFields: ComposeInputFieldConfigMap,
    typeName?: string = ''
  ): GraphQLInputFieldConfigMap {
    const fields = {};
    Object.keys(composeFields).forEach(name => {
      fields[name] = this.convertInputFieldConfig(composeFields[name], name, typeName);
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
    return innerType && new GraphQLNonNull(((innerType: any): GraphQLNullableType));
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
  return keyValMap(
    values,
    value => value.name.value,
    value => {
      const type = produceInputType(value.type);
      return {
        type,
        description: getDescription(value),
        defaultValue: valueFromAST(value.defaultValue, type),
      };
    }
  );
}

function makeFieldDefMap(def: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode) {
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

function buildWrappedType(innerType: GraphQLType, inputTypeAST: TypeNode): GraphQLType {
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
  return def.interfaces && def.interfaces.map(iface => produceInterfaceType(iface));
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
  const deprecatedAST =
    directives &&
    find(directives, directive => directive.name.value === GraphQLDeprecatedDirective.name);
  if (!deprecatedAST) {
    return;
  }
  const { reason } = getArgumentValues(GraphQLDeprecatedDirective, deprecatedAST);
  return (reason: any); // eslint-disable-line
}
