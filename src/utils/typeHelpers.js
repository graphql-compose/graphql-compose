/* @flow */
import { isType, parse, type GraphQLType } from '../graphql';
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

export function getComposeTypeName(type: mixed): string {
  if (typeof type === 'string') {
    if (/^[_a-zA-Z][_a-zA-Z0-9]*$/.test(type)) {
      // single type name
      return type;
    } else {
      // parse type name from `type Name { f: Int }`
      const docNode = parse(type);
      if (
        docNode.definitions[0] &&
        docNode.definitions[0].name &&
        typeof docNode.definitions[0].name.value === 'string'
      ) {
        return docNode.definitions[0].name.value;
      }
    }

    throw new Error(`Cannot get type name from string: ${inspect(type)}`);
  } else {
    try {
      const gqlType = getGraphQLType(type);
      if (typeof gqlType.name === 'string') {
        return gqlType.name;
      }
    } catch (e) {
      throw new Error(`Cannot get type name from ${inspect(type)}`);
    }
  }

  throw new Error(`Cannot get type name from ${inspect(type)}`);
}
