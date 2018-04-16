/* @flow strict */
/* eslint-disable no-param-reassign, no-use-before-define */

import { isFunction, isObject } from './is';
import type { SchemaComposer } from '../SchemaComposer';
import type { GraphQLFieldConfig, GraphQLArgumentConfig } from '../graphql';
import type { ObjMap } from '../utils/definitions';
import type { ComposeInputFieldConfig } from '../InputTypeComposer';

export type FieldMap = {
  [fieldName: string]: any,
  __proto__: null,
};

export type GraphQLFieldConfigMapExtended<TSource, TContext> = ObjMap<
  GraphQLFieldConfig<TSource, TContext> & { _fieldAsThunk?: () => any, _typeAsThunk?: () => any }
>;

export function resolveOutputConfigsAsThunk<TContext>(
  schema: SchemaComposer<TContext>,
  fieldMap: FieldMap,
  typeName?: string = ''
): GraphQLFieldConfigMapExtended<any, TContext> {
  if (isObject(fieldMap)) {
    Object.keys(fieldMap).forEach(name => {
      if (isFunction(fieldMap[name])) {
        const fieldConfig: any = schema.typeMapper.convertOutputFieldConfig(
          fieldMap[name](),
          name,
          typeName
        );
        fieldConfig._fieldAsThunk = fieldMap[name];
        fieldMap[name] = fieldConfig;
      }

      if (isFunction(fieldMap[name].type)) {
        fieldMap[name]._typeAsThunk = fieldMap[name].type;
        const fieldConfig = schema.typeMapper.convertOutputFieldConfig(
          fieldMap[name].type(),
          name,
          typeName
        );
        fieldMap[name].type = fieldConfig.type;
      }

      if (isObject(fieldMap[name].args)) {
        fieldMap[name].args = resolveInputConfigMapAsThunk(
          schema,
          fieldMap[name].args,
          `${typeName}.${name}.args`
        );
      }
    });
  }
  return fieldMap;
}

export function resolveInputConfigAsThunk(
  schema: SchemaComposer<any>,
  fc: ComposeInputFieldConfig,
  name: string,
  typeName?: string
): GraphQLArgumentConfig {
  let fieldConfig: GraphQLArgumentConfig;
  if (isFunction(fc)) {
    fieldConfig = (schema.typeMapper.convertInputFieldConfig(fc(), name, typeName): any);
    fieldConfig._fieldAsThunk = fc;
  } else {
    fieldConfig = (fc: any);
  }

  if (isFunction(fieldConfig.type)) {
    fieldConfig._typeAsThunk = fieldConfig.type;
    fieldConfig.type = schema.typeMapper.convertInputFieldConfig(
      fieldConfig.type(),
      name,
      typeName
    ).type;
  }

  return fieldConfig;
}

export function resolveInputConfigMapAsThunk<T: FieldMap>(
  schema: SchemaComposer<any>,
  fieldMap: T,
  typeName?: string
): T {
  if (isObject(fieldMap)) {
    Object.keys(fieldMap).forEach(name => {
      fieldMap[name] = resolveInputConfigAsThunk(schema, fieldMap[name], name, typeName);
    });
  }
  return fieldMap;
}

export function keepConfigsAsThunk<T: FieldMap>(fieldMap: T): T {
  if (isObject(fieldMap)) {
    Object.keys(fieldMap).forEach(key => {
      if (fieldMap[key]._fieldAsThunk) {
        fieldMap[key] = fieldMap[key]._fieldAsThunk;
      } else {
        if (fieldMap[key]._typeAsThunk) {
          fieldMap[key].type = fieldMap[key]._typeAsThunk;
        }
        if (fieldMap[key].args) {
          fieldMap[key].args = keepConfigsAsThunk(fieldMap[key].args);
        }
      }
    });
  }
  return fieldMap;
}
