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
import type { TypeComposer } from './typeComposer';
import type { InputTypeComposer } from './inputTypeComposer';
import type { SchemaComposer } from './schemaComposer';
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
  typeComposer: TypeComposer<any>,
  opts: toInputObjectTypeOpts = {},
  cache: Map<GraphQLObjectType, InputTypeComposer> = new Map()
): InputTypeComposer {
  if (typeComposer.hasInputTypeComposer()) {
    return typeComposer.getInputTypeComposer();
  }

  const schemaComposer = typeComposer.constructor._schema;
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

  const outputFields = removeWrongFields(typeComposer.getFields());
  const inputFields = {};
  Object.keys(outputFields).forEach(key => {
    const fieldOpts = {
      ...opts,
      fieldName: key,
      outputTypeName: typeComposer.getTypeName(),
    };
    inputFields[key] = convertInputObjectField(outputFields[key], fieldOpts, cache, schemaComposer);
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
  cache: Map<GraphQLObjectType, InputTypeComposer>,
  schemaComposer: SchemaComposer<any>
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
      const tc = new schemaComposer.TypeComposer(fieldType);
      fieldType = toInputObjectType(tc, typeOpts, cache).getType();
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
