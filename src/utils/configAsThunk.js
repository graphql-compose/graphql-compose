/* @flow */
/* eslint-disable no-param-reassign, no-use-before-define */

import TypeMapper from '../typeMapper';
import { isFunction, isObject } from './is';

export type FieldMaps = {
  [fieldName: string]: any,
};

export function resolveOutputConfigsAsThunk<T: FieldMaps>(fieldMap: T, typeName?: string = ''): T {
  if (isObject(fieldMap)) {
    Object.keys(fieldMap).forEach(name => {
      if (isFunction(fieldMap[name])) {
        const fieldConfig: any = TypeMapper.convertOutputFieldConfig(
          fieldMap[name](),
          name,
          typeName
        );
        fieldConfig._fieldAsThunk = fieldMap[name];
        fieldMap[name] = fieldConfig;
      }

      if (isFunction(fieldMap[name].type)) {
        fieldMap[name]._typeAsThunk = fieldMap[name].type;
        const fieldConfig = TypeMapper.convertOutputFieldConfig(
          fieldMap[name].type(),
          name,
          typeName
        );
        fieldMap[name].type = fieldConfig.type;
      }

      if (isObject(fieldMap[name].args)) {
        fieldMap[name].args = resolveInputConfigsAsThunk(
          fieldMap[name].args,
          `${typeName}.${name}.args`
        );
      }
    });
  }
  return fieldMap;
}

export function resolveInputConfigsAsThunk<T: FieldMaps>(fieldMap: T, typeName?: string): T {
  if (isObject(fieldMap)) {
    Object.keys(fieldMap).forEach(name => {
      if (isFunction(fieldMap[name])) {
        const fieldConfig: any = TypeMapper.convertInputFieldConfig(
          fieldMap[name](),
          name,
          typeName
        );
        fieldConfig._fieldAsThunk = fieldMap[name];
        fieldMap[name] = fieldConfig;
      }

      if (isFunction(fieldMap[name].type)) {
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

export function keepConfigsAsThunk<T: FieldMaps>(fieldMap: T): T {
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
