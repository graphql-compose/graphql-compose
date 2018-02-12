/* @flow strict */
/* eslint-disable no-restricted-globals */

import { GraphQLScalarType, GraphQLError, Kind } from '../graphql';

export default new GraphQLScalarType({
  name: 'Date',
  serialize(value) {
    // Valid string values:
    // 2016-02-02
    // 2016-02-02T00:13:22Z
    // 2016-02-02T00:13:22.000Z
    if (
      typeof value === 'string' &&
      /^(\d{4})-(\d{2})-(\d{2})(T((\d{2}):(\d{2}):(\d{2}))(\.(\d{1,3}))?Z)?$/.test(value)
    ) {
      return value;
    }

    if (!(value instanceof Date)) {
      throw new TypeError('Field error: value is not an instance of Date');
    }

    if (isNaN(value.getTime())) {
      throw new TypeError('Field error: value is an invalid Date');
    }

    return value.toJSON();
  },
  parseValue(value) {
    const date = new Date((value: any));

    if (isNaN(date.getTime())) {
      throw new TypeError('Field error: value is an invalid Date');
    }

    return date;
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) {
      throw new GraphQLError(
        `Query error: Can only parse strings to buffers but got a: ${ast.kind}`,
        [ast]
      );
    }

    const result = new Date(ast.value);
    if (isNaN(result.getTime())) {
      throw new GraphQLError('Query error: Invalid date', [ast]);
    }

    if (ast.value !== result.toJSON()) {
      throw new GraphQLError(
        'Query error: Invalid date format, only accepts: YYYY-MM-DDTHH:MM:SS.SSSZ',
        [ast]
      );
    }

    return result;
  },
});
