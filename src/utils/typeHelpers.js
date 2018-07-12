/* @flow */
import { isType, type GraphQLType } from '../graphql';
import { isFunction } from './is';
import { inspect } from './misc';

export function getGraphQLType(anyType: mixed): GraphQLType {
  let type = (anyType: any);

  // extract type from TypeComposer, InputTypeComposer, EnumTypeComposer and Resolver
  if (type && isFunction(type.getType)) {
    type = type.getType();
  }

  if (!isType(type)) {
    throw new Error(`You provide incorrect type for 'getGraphQLType' method: ${inspect(type)}`);
  }

  return type;
}
