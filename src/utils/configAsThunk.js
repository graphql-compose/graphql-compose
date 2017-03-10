/* @flow */
/* eslint-disable no-param-reassign */

import type {
  GraphQLInputFieldMap,
  GraphQLFieldMap,
} from 'graphql/type/definition';
import TypeMapper from '../typeMapper';
import { isFunction, isObject } from './is';

export type FieldMaps = GraphQLInputFieldMap | GraphQLFieldMap<*, *>;

export function resolveOutputConfigsAsThunk<T: FieldMaps>(
  fieldMap: T,
  typeName: string
): T {
  if (isObject(fieldMap)) {
    Object.keys(fieldMap).forEach(name => {
      if (isFunction(fieldMap[name])) {
        const fieldConfig = TypeMapper.convertOutputFieldConfig(
          fieldMap[name](),
          name,
          typeName
        );
        // $FlowFixMe
        fieldConfig._fieldAsThunk = fieldMap[name];
        fieldMap[name] = fieldConfig;
      }

      if (isFunction(fieldMap[name].type)) {
        // $FlowFixMe
        fieldMap[name]._typeAsThunk = fieldMap[name].type;
        const fieldConfig = TypeMapper.convertOutputFieldConfig(
          fieldMap[name].type(),
          name,
          typeName
        );
        fieldMap[name].type = fieldConfig.type;
      }
    });
  }
  return fieldMap;
}

export function resolveInputConfigsAsThunk<T: FieldMaps>(
  fieldMap: T,
  typeName: string
): T {
  if (isObject(fieldMap)) {
    Object.keys(fieldMap).forEach(name => {
      if (isFunction(fieldMap[name])) {
        const fieldConfig = TypeMapper.convertInputFieldConfig(
          fieldMap[name](),
          name,
          typeName
        );
        // $FlowFixMe
        fieldConfig._fieldAsThunk = fieldMap[name];
        fieldMap[name] = fieldConfig;
      }

      if (isFunction(fieldMap[name].type)) {
        // $FlowFixMe
        fieldMap[name]._typeAsThunk = fieldMap[name].type;
        const fieldConfig = TypeMapper.convertInputFieldConfig(
          fieldMap[name].type(),
          name,
          typeName
        );
        fieldMap[name].type = fieldConfig.type;
      }
    });
  }
  return fieldMap;
}

export function keepConfigsAsThunk<T: FieldMaps>(
  fieldMap: T
): T {
  if (isObject(fieldMap)) {
    Object.keys(fieldMap).forEach(key => {
      if (fieldMap[key]._fieldAsThunk) {
        // $FlowFixMe
        fieldMap[key] = fieldMap[key]._fieldAsThunk;
      } else if (fieldMap[key]._typeAsThunk) {
        // $FlowFixMe
        fieldMap[key].type = fieldMap[key]._typeAsThunk;
      }
    });
  }
  return fieldMap;
}
