import { GraphQLScalarType, GraphQLError } from 'graphql';
import { Kind } from 'graphql/language';


function coerceDate(value) {
  const json = JSON.stringify(value);
  return json.replace(/"/g, '\'');
}

export default new GraphQLScalarType({
  name: 'GQLReference',
  serialize: coerceDate,
  parseValue: coerceDate,
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) {
      throw new GraphQLError(
        `Query error: Can only parse strings to buffers but got a: ${ast.kind}`,
        [ast]
      );
    }

    const json = ast.value.replace(/'/g, '"');
    return JSON.parse(json);
  },
});
