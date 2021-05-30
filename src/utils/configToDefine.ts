/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

// This is internal methods of graphql-js (introduced in 14.0.0)
// required for correct config conversion to internal field definition of types
// copy pasted from https://github.com/graphql/graphql-js/blame/master/src/type/definition.js

import invariant from 'graphql/jsutils/invariant';
import type { Thunk } from './definitions';
import { inspect } from './misc';
import { isFunction, isObject } from './is';
import { SchemaComposer } from '../SchemaComposer';
import { ThunkComposer } from '../ThunkComposer';
import type {
  GraphQLFieldConfigMap,
  GraphQLInputFieldConfigMap,
  GraphQLFieldMap,
  GraphQLEnumType,
  GraphQLEnumValueConfigMap,
  GraphQLEnumValue,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLInputObjectType,
  GraphQLInputFieldMap,
  ObjectTypeDefinitionNode,
  InterfaceTypeDefinitionNode,
  EnumTypeDefinitionNode,
  FieldDefinitionNode,
  InputObjectTypeDefinitionNode,
} from '../graphql';
import type { InputTypeComposerFieldConfigMap } from '../InputTypeComposer';
import type { EnumTypeComposerValueConfigMap } from '../EnumTypeComposer';
import {
  ObjectTypeComposer,
  ObjectTypeComposerFieldConfigMap,
  ObjectTypeComposerFieldConfigMapDefinition,
  ObjectTypeComposerDefinition,
  ObjectTypeComposerThunked,
  ObjectTypeComposerArgumentConfigMap,
} from '../ObjectTypeComposer';
import {
  InterfaceTypeComposerDefinition,
  InterfaceTypeComposerThunked,
  InterfaceTypeComposer,
} from '../InterfaceTypeComposer';
import { getComposeTypeName } from './typeHelpers';

function isPlainObj(obj: any): obj is Record<any, any> {
  return obj && typeof obj === 'object' && !Array.isArray(obj);
}

export function defineFieldMap(
  config: GraphQLObjectType | GraphQLInterfaceType,
  fieldMap: GraphQLFieldConfigMap<any, any>,
  parentAstNode?: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode | null
): GraphQLFieldMap<any, any> {
  invariant(
    isPlainObj(fieldMap),
    `${config.name} fields must be an object with field names as keys or a ` +
      'function which returns such an object.'
  );

  // Perf: prepare AST node maps to avoid costly lookups
  const fieldAstNodeMap = Object.create(null);
  const argAstNodeMap = Object.create(null);

  for (const fieldNode of parentAstNode?.fields ?? []) {
    if (!fieldAstNodeMap[fieldNode.name.value]) {
      fieldAstNodeMap[fieldNode.name.value] = fieldNode;
      argAstNodeMap[fieldNode.name.value] = Object.create(null);
    }
    for (const argAstNode of fieldNode?.arguments ?? []) {
      if (!argAstNodeMap[fieldNode.name.value][argAstNode.name.value]) {
        argAstNodeMap[fieldNode.name.value][argAstNode.name.value] = argAstNode;
      }
    }
  }

  const resultFieldMap = Object.create(null);

  for (const fieldName of Object.keys(fieldMap)) {
    const fieldConfig = fieldMap[fieldName];
    const fieldNodeAst = fieldAstNodeMap[fieldName] as FieldDefinitionNode;
    invariant(
      isPlainObj(fieldConfig),
      `${config.name}.${fieldName} field config must be an object`
    );
    const field = {
      ...fieldConfig,
      isDeprecated: Boolean(fieldConfig.deprecationReason),
      name: fieldName,
      astNode: fieldNodeAst,
    };
    invariant(
      field.resolve == null || typeof field.resolve === 'function',
      `${config.name}.${fieldName} field resolver must be a function if ` +
        `provided, but got: ${inspect(field.resolve)}.`
    );
    const argsConfig = fieldConfig.args;
    if (!argsConfig) {
      field.args = [] as any;
    } else {
      invariant(
        isPlainObj(argsConfig),
        `${config.name}.${fieldName} args must be an object with argument names as keys.`
      );
      const fieldArgNodeMap = argAstNodeMap[fieldName] ?? {};
      field.args = Object.keys(argsConfig).map((argName) => {
        const arg = argsConfig[argName];
        return {
          name: argName,
          description: arg.description === undefined ? null : arg.description,
          type: arg.type,
          isDeprecated: Boolean(fieldConfig.deprecationReason),
          deprecationReason: arg?.deprecationReason,
          defaultValue: arg.defaultValue,
          astNode: fieldArgNodeMap[argName],
        };
      }) as any;
    }
    resultFieldMap[fieldName] = field;
  }
  return resultFieldMap;
}

export function convertObjectFieldMapToConfig(
  fieldMap: Thunk<GraphQLFieldMap<any, any> | ObjectTypeComposerFieldConfigMapDefinition<any, any>>,
  sc: SchemaComposer<any>
): ObjectTypeComposerFieldConfigMap<any, any> {
  const fields = {} as ObjectTypeComposerFieldConfigMap<any, any>;
  const isThunk = isFunction(fieldMap);
  const _fields: any = isThunk ? (fieldMap as any)(sc) : fieldMap;
  if (!isObject(_fields)) return {};
  Object.keys(_fields).forEach((n) => {
    const { name, isDeprecated, ...fc } = _fields[n];
    const args = {} as ObjectTypeComposerArgumentConfigMap;
    if (Array.isArray(fc.args)) {
      // `fc.args` is an Array in `GraphQLFieldMap`
      fc.args.forEach((arg: any) => {
        const { name: argName, ...ac } = arg;
        args[argName] = {
          ...ac,
          type: isThunk
            ? new ThunkComposer(
                () => sc.typeMapper.convertInputTypeDefinition(ac.type || arg) as any
              )
            : sc.typeMapper.convertInputTypeDefinition(ac.type || arg),
          directives: sc.typeMapper.parseDirectives(ac?.astNode?.directives),
        };
      });
      fc.args = args;
    } else if (isObject(fc.args)) {
      // `fc.args` is Object in `ObjectTypeComposerFieldConfigMapDefinition`
      Object.keys(fc.args).forEach((argName) => {
        const sourceArgs = fc.args;
        args[argName] = {
          ...(isObject(sourceArgs[argName]) ? sourceArgs[argName] : null),
          type: isThunk
            ? new ThunkComposer(
                () =>
                  sc.typeMapper.convertInputTypeDefinition(
                    sourceArgs[argName].type || sourceArgs[argName]
                  ) as any
              )
            : sc.typeMapper.convertInputTypeDefinition(
                sourceArgs[argName].type || sourceArgs[argName]
              ),
        };
      });
      fc.args = args;
    }

    fields[n] = {
      ...fc,
      type: isThunk
        ? new ThunkComposer(
            () => sc.typeMapper.convertOutputTypeDefinition(fc.type || _fields[n]) as any
          )
        : sc.typeMapper.convertOutputTypeDefinition(fc.type || _fields[n]),
      directives: sc.typeMapper.parseDirectives(fc?.astNode?.directives),
    };
  });
  return fields;
}

export function defineEnumValues(
  type: GraphQLEnumType,
  valueMap: GraphQLEnumValueConfigMap /* <T> */,
  parentAstNode?: EnumTypeDefinitionNode
): Array<GraphQLEnumValue /* <T> */> {
  invariant(
    isPlainObj(valueMap),
    `${type.name} values must be an object with value names as keys.`
  );

  const astNodeMap = Object.create(null);
  for (const valueNode of parentAstNode?.values ?? []) {
    astNodeMap[valueNode.name.value] = valueNode;
  }

  return Object.keys(valueMap).map((valueName) => {
    const value = valueMap[valueName];
    invariant(
      isPlainObj(value),
      `${type.name}.${valueName} must refer to an object with a "value" key ` +
        `representing an internal value but got: ${inspect(value)}.`
    );
    invariant(
      !value.hasOwnProperty('isDeprecated'),
      `${type.name}.${valueName} should provide "deprecationReason" instead of "isDeprecated".`
    );
    return {
      name: valueName,
      description: value.description,
      isDeprecated: Boolean(value.deprecationReason),
      deprecationReason: value.deprecationReason,
      astNode: astNodeMap[valueName],
      value: value.hasOwnProperty('value') ? value.value : valueName,
      extensions: undefined,
    };
  });
}

export function convertEnumValuesToConfig(
  values: GraphQLEnumValue[],
  schemaComposer: SchemaComposer<any>
): EnumTypeComposerValueConfigMap {
  const fields = {} as EnumTypeComposerValueConfigMap;
  values.forEach(({ name, isDeprecated, ...fc }) => {
    fields[name] = fc as any;
    if (fc?.astNode?.directives) {
      const directives = schemaComposer.typeMapper.parseDirectives(fc.astNode.directives);
      if (directives) {
        fields[name].directives = directives;
      }
    }
  });
  return fields;
}

export function defineInputFieldMap(
  config: GraphQLInputObjectType,
  fieldMap: GraphQLInputFieldConfigMap,
  parentAstNode?: InputObjectTypeDefinitionNode | null
): GraphQLInputFieldMap {
  invariant(
    isPlainObj(fieldMap),
    `${config.name} fields must be an object with field names as keys or a ` +
      'function which returns such an object.'
  );
  const astNodeMap = Object.create(null);
  for (const fieldNode of parentAstNode?.fields ?? []) {
    astNodeMap[fieldNode.name.value] = fieldNode;
  }

  const resultFieldMap = Object.create(null);
  for (const fieldName of Object.keys(fieldMap)) {
    const field = {
      ...fieldMap[fieldName],
      name: fieldName,
      astNode: astNodeMap[fieldName],
    };
    invariant(
      !field.hasOwnProperty('resolve'),
      `${config.name}.${fieldName} field has a resolve property, but ` +
        'Input Types cannot define resolvers.'
    );
    resultFieldMap[fieldName] = field;
  }
  return resultFieldMap;
}

export function convertInputFieldMapToConfig(
  fieldMap: Thunk<GraphQLInputFieldMap>,
  sc: SchemaComposer<any>
): InputTypeComposerFieldConfigMap {
  const fields = {} as InputTypeComposerFieldConfigMap;
  const isThunk = isFunction(fieldMap);
  const _fields: any = isThunk ? (fieldMap as any)(sc) : fieldMap;
  Object.keys(_fields).forEach((n) => {
    const { name, isDeprecated, ...fc } = _fields[n];
    fields[n] = {
      ...fc,
      type: isThunk
        ? new ThunkComposer(
            () => sc.typeMapper.convertInputTypeDefinition(fc.type || _fields[n]) as any
          )
        : sc.typeMapper.convertInputTypeDefinition(fc.type || _fields[n]),
      directives: sc.typeMapper.parseDirectives(fc?.astNode?.directives),
    };
  });
  return fields;
}

export function convertObjectTypeArrayAsThunk(
  types: Thunk<
    ReadonlyArray<
      | GraphQLObjectType
      | ObjectTypeComposerDefinition<any, any>
      | ObjectTypeComposerThunked<any, any>
    >
  >,
  sc: SchemaComposer<any>
): Array<ObjectTypeComposerThunked<any, any>> {
  const isThunk = isFunction(types);
  const t: any = isThunk ? (types as any)(sc) : types;
  if (!Array.isArray(t)) return [];

  return t.map((type) => {
    if (type instanceof ObjectTypeComposer || type instanceof ThunkComposer) {
      return type;
    }
    const tc = sc.typeMapper.convertOutputTypeDefinition(type);
    if (!tc && isThunk) {
      return new ThunkComposer(
        () => sc.typeMapper.convertOutputTypeDefinition(type) as any,
        getComposeTypeName(type, sc)
      );
    }
    if (!(tc instanceof ObjectTypeComposer) && !(tc instanceof ThunkComposer)) {
      throw new Error(`Should be provided ObjectType but received ${inspect(type)}`);
    }
    return tc;
  });
}

export function convertInterfaceArrayAsThunk(
  types: Thunk<
    ReadonlyArray<
      | InterfaceTypeComposerDefinition<any, any>
      | Readonly<GraphQLInterfaceType>
      | Readonly<InterfaceTypeComposerThunked<any, any>>
    >
  >,
  sc: SchemaComposer<any>
): Array<InterfaceTypeComposerThunked<any, any>> {
  const isThunk = isFunction(types);
  const t: any = isThunk ? (types as any)(sc) : types;
  if (!Array.isArray(t)) return [];
  return t.map((type) => {
    if (type instanceof InterfaceTypeComposer || type instanceof ThunkComposer) {
      return type;
    }

    return isThunk
      ? new ThunkComposer(
          () => sc.typeMapper.convertInterfaceTypeDefinition(type) as any,
          getComposeTypeName(type, sc)
        )
      : sc.typeMapper.convertInterfaceTypeDefinition(type);
  });
}
