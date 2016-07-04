# Right now just proposal, stay tunned.
See my previous production ready, but unpublished version of mongoose to graphql module: https://github.com/nodkz/graphql-mongoose
By this link you may find example of mash-code in my app, which derived from a map-derived-schema adapters/converters.
So I have brilliant thoughts how to simplify it!

🌶🌶🌶 Long live to middlewares and compose!🌶🌶🌶  
I wanted to finish `graphql-compose` module in the End of June, but it takes too much time. So... Welcome July!

To-Do
=====
- [x] write mongoose schema converter to graphql types with CRUD resolver helpers [graphql-compose-mongoose](https://github.com/nodkz/graphql-compose-mongoose)
- [ ] write a Relay types wrapper for adding relay specifics things, like `Node` type and interface, `globalId`, `clientMutationId`() [graphql-compose-relay](https://github.com/nodkz/graphql-compose-relay)
- [ ] polish `graphq-compose`, add access restrictions to fields, attach custom logic to resolvers, docs and examples
- [ ] write [DataLoader](https://github.com/facebook/dataloader) resolver's wrapper for reducing number of queries
- [ ] add support for PubSub. Introduce subscriptions to your graphql schemas
- [ ] write `graphql-compose-remote-graphql` module, for building your own types which will resolve from 3rd party graphql servers
- [ ] write `graphql-compose-rest` module, for building your own types which will resolve from 3rd party REST api's. It will be prototype for simple and fast realization of your rest wrappers
- [ ] **need help** find somebody who write `graphql-compose-sequilze` module like `graphql-compose-mongoose` (need to write types converter, and change resolver functions). Flow type and mocha tests are required!

GraphQL-compose
======================

The `GraphQL-compose` is a module which allow construct flexible graphql schema from different data sources via plugins (Mongoose, DataLoader, Redis, Fetch and so on).
You may extend types, rename fields, reduce access to fields, attach custom logic to resolvers and much more.
Middlewares and converters should solve problem of mash code in schemas, which derived via map configs.

THE FUTURE OF CRAZY GRAPHQL SCHEMAS NOT SO FAR ;).


Installation
============

`npm install graphql-compose` - it is too early to run this command, module is not ready yet
Current version 0.0.2 published for testing and playing with  [graphql-compose-mongoose](https://github.com/nodkz/graphql-compose-mongoose)


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


Other
=====

[CHANGELOG](https://github.com/nodkz/graphql-compose/blob/master/CHANGELOG.md)

License
=======
[MIT](https://github.com/nodkz/graphql-compose/blob/master/LICENSE.md)
