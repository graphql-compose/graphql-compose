

export function deprecate(msg) {
  let stack;
  let stackStr = '';
  const error = new Error();

  if (error.stack) {
    stack = error.stack.replace(/^\s+at\s+/gm, '').split('\n');
    stackStr = `\n    ${stack.slice(2, 7).join('\n    ')}`;
  }

  console.log(`DEPRECATION: ${msg} \n${stackStr}`);
}
