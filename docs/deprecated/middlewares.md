Middlewares
===========

### Basics
`graphql-compose` middleware have 3 phases:
- `setup phase`, which runs only once, when middleware added to the `GraphQL-compose`
- `capturing phase`, when you may change properties before it will pass to next middleware
- `bubbling phase`, when you may change response from underlying middlewares

Middlewares use LIFO (last in, first out) stack. Or simply put - use `compose` function. So if you pass such middlewares [M1(opts), M2(opts)] it will be work such way:
- call setup phase of `M1` with its opts
- call setup phase of `M2` with its opts
- for each run
 - call capture phase of `M1` (changing args)
 - call capture phase of `M2` (changing args)
 - call `some-internal-bottom` method with prepared args in capture phase and pass result to bubbling phase
 - call bubbling phase of `M2` (changing result)
 - call bubbling phase of `M1` (changing result)
 - pass result to `some-internal-upper` method.


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
