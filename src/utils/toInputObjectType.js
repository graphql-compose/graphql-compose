/* @flow strict */
/* eslint-disable no-use-before-define, prefer-template */

import util from 'util';
import {
  GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLInterfaceType,
  isInputType,
  GraphQLUnionType,
  GraphQLList,
  GraphQLNonNull,
} from '../graphql';
import { TypeComposer } from '../TypeComposer';
import type { InterfaceTypeComposer } from '../InterfaceTypeComposer';
import type { InputTypeComposer } from '../InputTypeComposer';
import type { SchemaComposer } from '../SchemaComposer';
import GenericType from '../type/generic';
import { upperFirst } from './misc';
import type { GraphQLType, GraphQLInputType, GraphQLNamedType } from '../graphql';

export type toInputObjectTypeOpts = {
  prefix?: string,
  postfix?: string,
};

export function toInputObjectType(
  typeComposer: TypeComposer<any> | InterfaceTypeComposer<any>,
  opts: toInputObjectTypeOpts = {},
  cache: Map<GraphQLNamedType, InputTypeComposer> = new Map()
): InputTypeComposer {
  if (typeComposer instanceof TypeComposer && typeComposer.hasInputTypeComposer()) {
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
    const inputType = convertInputObjectField(fc.type, fieldOpts, cache, schemaComposer);
    if (inputType) {
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
  cache: Map<GraphQLNamedType, InputTypeComposer>,
  schemaComposer: SchemaComposer<any>
): ?GraphQLInputType {
  let fieldType = field;

  const wrappers = [];
  while (fieldType instanceof GraphQLList || fieldType instanceof GraphQLNonNull) {
    wrappers.unshift(fieldType.constructor);
    fieldType = fieldType.ofType;
  }

  if (fieldType instanceof GraphQLUnionType) {
    return null;
  }

  if (!isInputType(fieldType)) {
    if (fieldType instanceof GraphQLObjectType || fieldType instanceof GraphQLInterfaceType) {
      const typeOpts = {
        prefix: `${opts.prefix || ''}${upperFirst(opts.outputTypeName || '')}`,
        postfix: opts.postfix || 'Input',
      };
      const tc =
        fieldType instanceof GraphQLObjectType
          ? new schemaComposer.TypeComposer(fieldType)
          : new schemaComposer.InterfaceTypeComposer(fieldType);
      fieldType = toInputObjectType(tc, typeOpts, cache).getType();
    } else {
      // eslint-disable-next-line
      console.error(
        `graphql-compose: can not convert field '${opts.outputTypeName || ''}.${opts.fieldName ||
          ''}' to InputType` +
          '\nIt should be GraphQLObjectType or GraphQLInterfaceType, but got \n' +
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
