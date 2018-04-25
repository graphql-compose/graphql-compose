/* @flow strict */
/* eslint-disable no-use-before-define, prefer-template */

import util from 'util';
import {
  GraphQLInputObjectType,
  GraphQLObjectType,
  isInputType,
  isAbstractType,
  GraphQLList,
  GraphQLNonNull,
} from '../graphql';
import type { TypeComposer } from '../TypeComposer';
import type { InputTypeComposer } from '../InputTypeComposer';
import type { SchemaComposer } from '../SchemaComposer';
import GenericType from '../type/generic';
import { upperFirst } from './misc';
import type { GraphQLType, GraphQLInputType } from '../graphql';

export type toInputObjectTypeOpts = {
  prefix?: string,
  postfix?: string,
};

export function toInputObjectType(
  typeComposer: TypeComposer<any>,
  opts: toInputObjectTypeOpts = {},
  cache: Map<GraphQLObjectType, InputTypeComposer> = new Map()
): InputTypeComposer {
  if (typeComposer.hasInputTypeComposer()) {
    return typeComposer.getInputTypeComposer();
  }

  const schemaComposer = typeComposer.constructor.schemaComposer;
  const prefix: string = opts.prefix || '';
  const postfix: string = opts.postfix || 'Input';

  const inputTypeName = `${prefix}${typeComposer.getTypeName()}${postfix}`;
  const type = typeComposer.getType();
  if (cache.has(type)) {
    const itc: any = cache.get(type);
    return itc;
  }

  const inputTypeComposer = new schemaComposer.InputTypeComposer(
    new GraphQLInputObjectType({
      name: inputTypeName,
      fields: {},
    })
  );
  cache.set(typeComposer.getType(), inputTypeComposer);

  const fieldNames = typeComposer.getFieldNames();
  const inputFields = {};
  fieldNames.forEach(fieldName => {
    const fieldOpts = {
      ...opts,
      fieldName,
      outputTypeName: typeComposer.getTypeName(),
    };
    const fc = typeComposer.getFieldConfig(fieldName);
    if (!isAbstractType(fc.type)) {
      const inputType = convertInputObjectField(fc.type, fieldOpts, cache, schemaComposer);
      inputFields[fieldName] = {
        type: inputType,
        description: fc.description,
      };
    }
  });
  inputTypeComposer.addFields(inputFields);

  return inputTypeComposer;
}

export type ConvertInputObjectFieldOpts = {
  prefix?: string,
  postfix?: string,
  fieldName?: string,
  outputTypeName?: string,
};

export function convertInputObjectField(
  field: GraphQLType,
  opts: ConvertInputObjectFieldOpts,
  cache: Map<GraphQLObjectType, InputTypeComposer>,
  schemaComposer: SchemaComposer<any>
): GraphQLInputType {
  let fieldType = field;

  const wrappers = [];
  while (fieldType instanceof GraphQLList || fieldType instanceof GraphQLNonNull) {
    wrappers.unshift(fieldType.constructor);
    fieldType = fieldType.ofType;
  }

  if (!isInputType(fieldType)) {
    if (fieldType instanceof GraphQLObjectType) {
      const typeOpts = {
        prefix: `${opts.prefix || ''}${upperFirst(opts.outputTypeName || '')}`,
        postfix: opts.postfix || 'Input',
      };
      const tc = new schemaComposer.TypeComposer(fieldType);
      fieldType = toInputObjectType(tc, typeOpts, cache).getType();
    } else {
      // eslint-disable-next-line
      console.error(
        `graphql-compose: can not convert field '${opts.outputTypeName || ''}.${opts.fieldName ||
          ''}' to InputType` +
          '\nIt should be GraphQLObjectType, but got \n' +
          util.inspect(fieldType, { depth: 2, colors: true })
      );
      fieldType = GenericType;
    }
  }

  const inputFieldType: GraphQLInputType = wrappers.reduce(
    (type, Wrapper) => new Wrapper(type),
    fieldType
  );

  return inputFieldType;
}
