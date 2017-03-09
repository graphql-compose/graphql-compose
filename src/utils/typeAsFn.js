/* @flow */
/* eslint-disable no-param-reassign */

import type {
  GraphQLInputFieldMap,
  GraphQLFieldMap,
} from 'graphql/type/definition';
import { isFunction, isObject } from './is';

export type FieldMaps = GraphQLInputFieldMap | GraphQLFieldMap<*, *>;

export function unwrapFieldsType<T: FieldMaps>(
  fieldMap: T
): T {
  if (isObject(fieldMap)) {
    Object.keys(fieldMap).forEach(key => {
      if (isFunction(fieldMap[key].type)) {
        // $FlowFixMe
        fieldMap[key]._typeFn = fieldMap[key].type;
        // $FlowFixMe
        fieldMap[key].type = fieldMap[key].type();
      }
    });
  }
  return fieldMap;
}

export function wrapFieldsType<T: FieldMaps>(
  fieldMap: T
): T {
  if (isObject(fieldMap)) {
    Object.keys(fieldMap).forEach(key => {
      if (fieldMap[key]._typeFn) {
        // $FlowFixMe
        fieldMap[key].type = fieldMap[key]._typeFn;
      }
    });
  }
  return fieldMap;
}
