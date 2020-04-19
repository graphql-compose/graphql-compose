/* @flow strict */
/* eslint-disable no-use-before-define */

// This is internal methods of graphql-js (introduced in 14.0.0)
// required for corret config convertion to internal field definition of types
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
  type ObjectTypeComposerFieldConfigMap,
  type ObjectTypeComposerFieldConfigMapDefinition,
  type ObjectTypeComposerDefinition,
  type ObjectTypeComposerThunked,
} from '../ObjectTypeComposer';
import {
  type InterfaceTypeComposerDefinition,
  type InterfaceTypeComposerThunked,
  InterfaceTypeComposer,
} from '../InterfaceTypeComposer';
import { getComposeTypeName } from './typeHelpers';

function isPlainObj(obj) {
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

  const resultFieldMap = Object.create(null);
  for (const fieldName of Object.keys(fieldMap)) {
    const fieldConfig = fieldMap[fieldName];
    // $FlowFixMe
    const fieldNodeAst: ?FieldDefinitionNode = parentAstNode?.fields?.find(
      (f) => f.name.value === fieldName
    );
    invariant(
      isPlainObj(fieldConfig),
      `${config.name}.${fieldName} field config must be an object`
    );
    invariant(
      !fieldConfig.hasOwnProperty('isDeprecated'),
      `${config.name}.${fieldName} should provide "deprecationReason" ` +
        'instead of "isDeprecated".'
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
      field.args = ([]: any);
    } else {
      invariant(
        isPlainObj(argsConfig),
        `${config.name}.${fieldName} args must be an object with argument names as keys.`
      );
      field.args = (Object.keys(argsConfig).map((argName) => {
        const arg = argsConfig[argName];
        return {
          name: argName,
          description: arg.description === undefined ? null : arg.description,
          type: arg.type,
          defaultValue: arg.defaultValue,
          // $FlowFixMe
          astNode: fieldNodeAst?.arguments?.find((a) => a.name.value === argName),
        };
      }): any);
    }
    resultFieldMap[fieldName] = field;
  }
  return resultFieldMap;
}

export function convertObjectFieldMapToConfig(
  fieldMap: Thunk<GraphQLFieldMap<any, any> | ObjectTypeComposerFieldConfigMapDefinition<any, any>>,
  schemaComposer: SchemaComposer<any>
): ObjectTypeComposerFieldConfigMap<any, any> {
  const fields = {};
  const isThunk = isFunction(fieldMap);
  const _fields: any = isThunk ? (fieldMap: any)() : fieldMap;
  if (!isObject(_fields)) return {};
  Object.keys(_fields).forEach((n) => {
    const { name, isDeprecated, ...fc } = _fields[n];
    const args = {};
    if (Array.isArray(fc.args)) {
      // `fc.args` is an Array in `GraphQLFieldMap`
      fc.args.forEach((arg) => {
        const { name: argName, ...ac } = arg;
        args[argName] = {
          ...ac,
          type: isThunk
            ? new ThunkComposer(() =>
                schemaComposer.typeMapper.convertInputTypeDefinition(ac.type || arg)
              )
            : schemaComposer.typeMapper.convertInputTypeDefinition(ac.type || arg),
        };
        if (ac?.astNode?.directives) {
          const directives = schemaComposer.typeMapper.parseDirectives(ac.astNode.directives);
          if (directives) {
            if (!args[argName].extensions) args[argName].extensions = {};
            args[argName].extensions.directives = directives;
          }
        }
      });
      fc.args = (args: any);
    } else if (isObject(fc.args)) {
      // `fc.args` is Object in `ObjectTypeComposerFieldConfigMapDefinition`
      Object.keys(fc.args).forEach((argName) => {
        args[argName] = {
          ...(isObject(fc.args[argName]) ? fc.args[argName] : null),
          type: isThunk
            ? new ThunkComposer(() =>
                schemaComposer.typeMapper.convertInputTypeDefinition(
                  fc.args[argName].type || fc.args[argName]
                )
              )
            : schemaComposer.typeMapper.convertInputTypeDefinition(
                fc.args[argName].type || fc.args[argName]
              ),
        };
      });
      fc.args = (args: any);
    }

    fields[n] = {
      ...fc,
      type: isThunk
        ? new ThunkComposer(() =>
            schemaComposer.typeMapper.convertOutputTypeDefinition(fc.type || _fields[n])
          )
        : schemaComposer.typeMapper.convertOutputTypeDefinition(fc.type || _fields[n]),
    };

    if (fc?.astNode?.directives) {
      const directives = schemaComposer.typeMapper.parseDirectives(fc.astNode.directives);
      if (directives) {
        if (!fields[n].extensions) fields[n].extensions = {};
        fields[n].extensions.directives = directives;
      }
    }
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
      // $FlowFixMe
      astNode: parentAstNode?.values?.find((v) => v.name.value === valueName),
      value: value.hasOwnProperty('value') ? value.value : valueName,
      extensions: undefined,
    };
  });
}

export function convertEnumValuesToConfig(
  values: GraphQLEnumValue[],
  schemaComposer: SchemaComposer<any>
): EnumTypeComposerValueConfigMap {
  const fields = {};
  values.forEach(({ name, isDeprecated, ...fc }) => {
    fields[name] = fc;
    if (fc?.astNode?.directives) {
      const directives = schemaComposer.typeMapper.parseDirectives(fc.astNode.directives);
      if (directives) {
        if (!fields[name].extensions) fields[name].extensions = {};
        fields[name].extensions.directives = directives;
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
  const resultFieldMap = Object.create(null);
  for (const fieldName of Object.keys(fieldMap)) {
    const field = {
      ...fieldMap[fieldName],
      name: fieldName,
      // $FlowFixMe
      astNode: parentAstNode?.fields?.find((f) => f.name.value === fieldName),
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
  schemaComposer: SchemaComposer<any>
): InputTypeComposerFieldConfigMap {
  const fields = {};
  const isThunk = isFunction(fieldMap);
  const _fields: any = isThunk ? (fieldMap: any)() : fieldMap;
  Object.keys(_fields).forEach((n) => {
    const { name, isDeprecated, ...fc } = _fields[n];
    fields[n] = {
      ...fc,
      type: isThunk
        ? new ThunkComposer(() =>
            schemaComposer.typeMapper.convertInputTypeDefinition(fc.type || _fields[n])
          )
        : schemaComposer.typeMapper.convertInputTypeDefinition(fc.type || _fields[n]),
    };
    if (fc?.astNode?.directives) {
      const directives = schemaComposer.typeMapper.parseDirectives(fc.astNode.directives);
      if (directives) {
        if (!fields[n].extensions) fields[n].extensions = {};
        fields[n].extensions.directives = directives;
      }
    }
  });
  return fields;
}

export function convertObjectTypeArrayAsThunk(
  types: Thunk<
    $ReadOnlyArray<
      | GraphQLObjectType
      | ObjectTypeComposerDefinition<any, any>
      | ObjectTypeComposerThunked<any, any>
    >
  >,
  sc: SchemaComposer<any>
): Array<ObjectTypeComposerThunked<any, any>> {
  const isThunk = isFunction(types);
  const t: any = isThunk ? (types: any)() : types;
  if (!Array.isArray(t)) return [];

  return t.map((type) => {
    if (type instanceof ObjectTypeComposer || type instanceof ThunkComposer) {
      return type;
    }
    const tc = sc.typeMapper.convertOutputTypeDefinition(type);
    if (!tc && isThunk) {
      return new ThunkComposer(
        () => sc.typeMapper.convertOutputTypeDefinition(type),
        getComposeTypeName(type)
      );
    }
    if (!(tc instanceof ObjectTypeComposer) && !(tc instanceof ThunkComposer)) {
      throw new Error(`Should be provided ObjectType but recieved ${inspect(type)}`);
    }
    return tc;
  });
}

export function convertInterfaceArrayAsThunk(
  types: Thunk<
    $ReadOnlyArray<
      | InterfaceTypeComposerDefinition<any, any>
      | $ReadOnly<GraphQLInterfaceType>
      | $ReadOnly<InterfaceTypeComposerThunked<any, any>>
    >
  >,
  sc: SchemaComposer<any>
): Array<InterfaceTypeComposerThunked<any, any>> {
  const isThunk = isFunction(types);
  const t: any = isThunk ? (types: any)() : types;
  if (!Array.isArray(t)) return [];
  return t.map((type) => {
    if (type instanceof InterfaceTypeComposer || type instanceof ThunkComposer) {
      return type;
    }

    return isThunk
      ? new ThunkComposer(
          () => sc.typeMapper.convertInterfaceTypeDefinition(type),
          getComposeTypeName(type)
        )
      : sc.typeMapper.convertInterfaceTypeDefinition(type);
  });
}
