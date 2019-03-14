import { GraphQLType, GraphQLInputType, GraphQLObjectType } from '../graphql';
import { InputTypeComposer } from '../InputTypeComposer';
import { ObjectTypeComposer } from '../ObjectTypeComposer';
import { InterfaceTypeComposer } from '../InterfaceTypeComposer';
import { SchemaComposer } from '../SchemaComposer';

export interface ToInputObjectTypeOpts {
  prefix?: string;
  postfix?: string;
}

export function toInputObjectType(
  tc: ObjectTypeComposer<any, any> | InterfaceTypeComposer<any, any>,
  opts?: ToInputObjectTypeOpts,
): InputTypeComposer;

export interface ConvertInputObjectFieldOpts {
  prefix?: string;
  postfix?: string;
  fieldName?: string;
  outputTypeName?: string;
}

export function convertInputObjectField(
  field: GraphQLType,
  opts: ConvertInputObjectFieldOpts,
  schemaComposer: SchemaComposer<any>,
): GraphQLInputType | null;
