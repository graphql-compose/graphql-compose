/* @flow */
/* eslint-disable no-use-before-define, prefer-template */

import util from 'util';
import {
  GraphQLInputObjectType,
  GraphQLObjectType,
  isInputType,
  isAbstractType,
  GraphQLList,
  GraphQLNonNull,
} from './graphql';
import TypeComposer from './typeComposer';
import InputTypeComposer from './inputTypeComposer';
import GenericType from './type/generic';
import { upperFirst } from './utils/misc';
import type {
  GraphQLFieldConfig,
  GraphQLFieldConfigMap,
  GraphQLType,
  GraphQLInputFieldConfig,
  GraphQLInputType,
} from './graphql';

export function removeWrongFields<TSource, TContext>(
  fields: GraphQLFieldConfigMap<TSource, TContext>
): GraphQLFieldConfigMap<TSource, TContext> {
  const result = {};
  Object.keys(fields).forEach(key => {
    const field = fields[key];
    if (
      !isAbstractType(field.type) && // skip interface fields
      !field._gqcResolver // skip fields that obtained via Resolver
    ) {
      result[key] = field;
    }
  });
  return result;
}

export type toInputObjectTypeOpts = {
  prefix?: string,
  postfix?: string,
};

export function toInputObjectType(
  typeComposer: TypeComposer,
  opts: toInputObjectTypeOpts = {},
  cache: Map<GraphQLObjectType, InputTypeComposer> = new Map()
): InputTypeComposer {
  if (typeComposer.hasInputTypeComposer()) {
    return typeComposer.getInputTypeComposer();
  }

  const prefix: string = opts.prefix || '';
  const postfix: string = opts.postfix || 'Input';

  const inputTypeName = `${prefix}${typeComposer.getTypeName()}${postfix}`;
  if (cache.has(typeComposer.getType())) {
    // $FlowFixMe
    return cache.get(typeComposer.getType());
  }

  const inputTypeComposer = new InputTypeComposer(
    new GraphQLInputObjectType({
      name: inputTypeName,
      fields: {},
    })
  );
  cache.set(typeComposer.getType(), inputTypeComposer);

  const outputFields = removeWrongFields(typeComposer.getFields());
  const inputFields = {};
  Object.keys(outputFields).forEach(key => {
    const fieldOpts = {
      ...opts,
      fieldName: key,
      outputTypeName: typeComposer.getTypeName(),
    };
    inputFields[key] = convertInputObjectField(outputFields[key], fieldOpts, cache);
  });
  inputTypeComposer.addFields(inputFields);

  return inputTypeComposer;
}

export type convertInputObjectFieldOpts = {
  prefix?: string,
  postfix?: string,
  fieldName?: string,
  outputTypeName?: string,
};

export function convertInputObjectField<TSource, TContext>(
  field: GraphQLFieldConfig<TSource, TContext>,
  opts: convertInputObjectFieldOpts,
  cache: Map<GraphQLObjectType, InputTypeComposer>
): GraphQLInputFieldConfig {
  let fieldType: GraphQLType = field.type;

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
      const typeComposer = new TypeComposer(fieldType);
      fieldType = toInputObjectType(typeComposer, typeOpts, cache).getType();
    } else {
      // eslint-disable-next-line
      console.error(
        `GQC: can not convert field '${opts.outputTypeName || ''}.${opts.fieldName ||
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

  return { type: inputFieldType, description: field.description };
}
