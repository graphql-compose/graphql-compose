import { GraphQLScalarType, GraphQLError, Kind } from '../graphql';

export default new GraphQLScalarType<Buffer, string>({
  name: 'Buffer',
  serialize(value: any) {
    if (!(value instanceof Buffer)) {
      throw new TypeError('Field error: value is not an instance of Buffer');
    }

    return value.toString();
  },
  parseValue(value) {
    if (typeof value !== 'string') {
      throw new Error('Field error: value must be a String');
    }
    return Buffer.from(value);
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) {
      throw new GraphQLError(
        `Query error: Can only parse strings to buffers but got a: ${ast.kind}`,
        [ast]
      );
    }

    const result = Buffer.from(ast.value);

    if (ast.value !== result.toString()) {
      throw new GraphQLError('Query error: Invalid buffer encoding', [ast]);
    }

    return result;
  },
});
