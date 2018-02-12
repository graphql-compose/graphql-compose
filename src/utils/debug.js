/* @flow strict */

export function deprecate(msg: string) {
  let stack;
  let stackStr = '';
  const error = new Error();

  if (error.stack) {
    stack = error.stack.replace(/^\s+at\s+/gm, '').split('\n');
    stackStr = `\n    ${stack.slice(2, 7).join('\n    ')}`;
  }

  // eslint-disable-next-line
  console.log(`GRAPHQL-COMPOSE DEPRECATION: ${msg} ${stackStr}\n\n`);
}
