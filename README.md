# Right now just proposal, stay tunned.
See previous production ready, but unpublished version of mongoose to graphql module (fully rewrited graffity-mongoose): https://github.com/nodkz/graphql-mongoose
By this link you may find what mash can be obtained from a map-derived-schema adapters/converters.
So long live to middlewares and compose! 
This module `graphql-compose` should be ready in Mid of June.


GraphQL-compose
======================

The `GraphQL-compose` is a module which allow construct flexible graphql schema from different data sources via plugins (Mongoose, DataLoader, Redis, Fetch and so on).
You may extend types, rename fields, reduce access to fields, attach custom logic to resolvers and much more.
Middlewares should solve problem of mash code in schemas, which derived via map configs. 

One more abstraction over graphql for clever peoples ;P for simple life ;).


Installation
============

`npm install graphql-compose` - it is too early to run this command, module is not ready yet 


Meta of Api
===========
Proposal of API which should be https://github.com/nodkz/graphql-compose/blob/master/src/metaApiProposal.js


Middlewares
===========

### Basics
All `GraphQL-compose` middlewares' types have 3 phases: 
- `setup phase`, which runs only once, when middleware added to the `GraphQL-compose` 
- `capturing phase`, when you may change properties before it will pass to next middleware
- `bubbling phase`, when you may change response from underlying middlewares

Middlewares use LIFO (last in, first out) stack. Or simply put - use `compose` function. So if you pass such middlewares [M1(opts), M2(opts)] it will be work such way:
- call setup phase of `M1` with its opts
- call setup phase of `M2` with its opts
- for each resolve
 - call capture phase of `M1`
 - call capture phase of `M2`
 - call `fetch` method
 - call bubbling phase of `M2`
 - call bubbling phase of `M1`
 - pass `payloadPromise` to graphql resolve method.
 

### How `resolveMiddleware` work internally [Promise]
```js
export default function resolveMiddleware(opts = {}) {
  // [SETUP PHASE]: here you can process `opts`, when you create Middleware
  
  return next => ({ source, args, context, info }) => {
    // [CAPTURING PHASE]: here you can change `source`, `args`, `context`, `info` before it will pass to `next` resolve function.
    // ...some code which modify params
    
    const payloadPromise = next({ source, args, context, info }); // pass request to following middleware and get response promise from it
    
    // [BUBBLING PHASE]: here you may change payload of underlying middlewares, via promise syntax 
    // ...some code, which may add `then()` or `catch()` to payload promise
    //    payloadPromise.then(payload => { console.log(payload); return payload; })
    
    return payloadPromise; // return payload promise to upper middleware 
  };
}
```

### How `typeMiddleware` works internally [Object]
```js
export default function typeMiddleware(opts = {}) {
  // [SETUP PHASE]: here you can process setup `opts`, when you create Middleware
  
  return next => ({ name, description, fields, interfaces, isTypeOf }) => {
    // [CAPTURING PHASE]: here you can change `name`, `description`, `fields`, `interfaces`, `isTypeOf` before it will pass to `next` middleware.
    // ...some code which modify params
    
    const typeConfig = next({ name, description, fields, interfaces, isTypeOf }); // passing config data to underlying middleware
    
    // [BUBBLING PHASE]: here you may change typeConfig returned from underlying middlewares.
    
    return typeConfig; // return typeConfig to upper middleware 
  };
}
```

### How `fieldMiddleware` works internally [Object]
```js
export default function fieldMiddleware(opts = {}) {
  // [SETUP PHASE]: here you can process setup `opts`, when you create Middleware
  
  return next => ({ type, description, args, resolve, deprecationReason }) => {
    // [CAPTURING PHASE]: here you can change `type`, `description`, `args`, `resolve`, `deprecationReason` before it will pass to `next` middleware.
    // ...some code which modify params
    
    const fieldConfig = next({ type, description, args, resolve, deprecationReason }); // passing config data to underlying middleware
    
    // [BUBBLING PHASE]: here you may change fieldConfig returned from underlying middlewares.
    
    return fieldConfig; // return fieldConfig to upper middleware 
  };
}
```


TODO
====


Contribute
==========
I actively welcome pull requests with code and doc fixes. 
Also if you made great middleware and want share it within this module, please feel free to open PR.

[CHANGELOG](https://github.com/nodkz/graphql-compose/blob/master/CHANGELOG.md)

License
=======
[MIT](https://github.com/nodkz/graphql-compose/blob/master/LICENSE.md)
