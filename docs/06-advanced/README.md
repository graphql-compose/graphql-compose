# Advanced

## Middlewares
TODO..

### How `resolveMiddleware` work internally
Will be executed for every request, if resolve needed for query serving.
Works in `Resolver`. Resolver knows output type, needed args and how to fetch and process data.  Each Type can have several named resolvers for retrieving one object, array of objects, a graphql connection type or perform mutation.
```js
export default function resolveMiddleware(opts = {}) {
  // [SETUP PHASE]: here you can process `opts`, when you create Middleware

  return next => resolveArgs => {
    // [CAPTURING PHASE]:
    // `resolveArgs` consist from { source, args, context, info }  (*type GraphQLFieldResolveFn*)
    // you may change `source`, `args`, `context`, `info` before it will pass to `next` resolve function.

    // ...some code which modify resolveParams

    // pass request to following middleware and get response promise from it
    const payloadPromise = next(resolveParams);

    // [BUBBLING PHASE]: here you may change payload of underlying middlewares, via promise syntax
    // ...some code, which may add `then()` or `catch()` to payload promise
    //    payloadPromise.then(payload => { console.log(payload); return payload; })

    return payloadPromise; // return payload promise to upper middleware
  };
}
```