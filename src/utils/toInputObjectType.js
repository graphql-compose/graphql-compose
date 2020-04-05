/* @flow strict */
/* eslint-disable no-use-before-define, prefer-template */

import { ObjectTypeComposer } from '../ObjectTypeComposer';
import { NonNullComposer } from '../NonNullComposer';
import { ListComposer } from '../ListComposer';
import { ThunkComposer } from '../ThunkComposer';
import { InterfaceTypeComposer } from '../InterfaceTypeComposer';
import type { InputTypeComposer } from '../InputTypeComposer';
import type { SchemaComposer } from '../SchemaComposer';
import {
  isSomeInputTypeComposer,
  type ComposeOutputType,
  type ComposeInputType,
} from './typeHelpers';
import { inspect } from './misc';
import { UnionTypeComposer } from '../UnionTypeComposer';

export type toInputObjectTypeOpts = {
  prefix?: string,
  postfix?: string,
};

export function toInputObjectType<TContext>(
  tc: ObjectTypeComposer<any, TContext> | InterfaceTypeComposer<any, TContext>,
  opts: toInputObjectTypeOpts = {}
): InputTypeComposer<TContext> {
  if (tc.hasInputTypeComposer()) {
    return tc.getInputTypeComposer();
  }

  const prefix: string = opts.prefix || '';
  const postfix: string = opts.postfix || 'Input';

  const inputTypeName = `${prefix}${tc.getTypeName()}${postfix}`;

  const inputTypeComposer = tc.schemaComposer.createInputTC(inputTypeName);
  tc.setInputTypeComposer(inputTypeComposer);

  const fieldNames = tc.getFieldNames();
  fieldNames.forEach((fieldName) => {
    const fieldOpts = {
      ...opts,
      fieldName,
      outputTypeName: tc.getTypeName(),
    };
    const fc = tc.getField(fieldName);
    const fieldInputType = convertInputObjectField(fc.type, fieldOpts, tc.schemaComposer);
    if (fieldInputType) {
      inputTypeComposer.setField(
        fieldName,
        ({
          type: fieldInputType,
          description: fc.description,
        }: any)
      );
    }
  });

  return inputTypeComposer;
}

export type ConvertInputObjectFieldOpts = {
  prefix?: string,
  postfix?: string,
  fieldName?: string,
  outputTypeName?: string,
};

export function convertInputObjectField(
  field: ComposeOutputType<any>,
  opts: ConvertInputObjectFieldOpts,
  schemaComposer: SchemaComposer<any>
): ComposeInputType | null {
  let tc: any = field;

  const wrappers = [];
  while (
    tc instanceof ListComposer ||
    tc instanceof NonNullComposer ||
    tc instanceof ThunkComposer
  ) {
    if (tc instanceof ThunkComposer) {
      tc = tc.getUnwrappedTC();
    } else {
      wrappers.unshift(tc.constructor);
      tc = tc.ofType;
    }
  }

  if (tc instanceof UnionTypeComposer) {
    return null;
  }

  if (!isSomeInputTypeComposer(tc)) {
    if (tc instanceof ObjectTypeComposer || tc instanceof InterfaceTypeComposer) {
      const typeOpts = {
        prefix: opts.prefix || '',
        postfix: opts.postfix || 'Input',
      };
      tc = toInputObjectType(tc, typeOpts);
    } else {
      // eslint-disable-next-line
      console.error(
        `graphql-compose: can not convert field '${opts.outputTypeName || ''}.${
          opts.fieldName || ''
        }' to InputType` +
          '\nIt should be ObjectType or InterfaceType, but got \n' +
          inspect(tc)
      );
      tc = schemaComposer.get('JSON');
    }
  }

  if (tc) {
    // wrap TypeComposer back
    tc = wrappers.reduce((type: any, Wrapper) => new Wrapper(type), tc);
  }

  return (tc: any);
}
