export default function deprecate(msg: string): void {
  let stack;
  let stackStr = '';
  const error = new Error();

  if (error.stack) {
    stack = error.stack.replace(/^\s+at\s+/gm, '').split('\n');
    stack.slice(2, 7).forEach((s, i) => {
      stackStr += i === 1 ? '\n--> ' : '\n    ';
      stackStr += s;
    });
  }

  console.log(`GRAPHQL-COMPOSE DEPRECATION: ${msg} ${stackStr}\n\n`);
}
