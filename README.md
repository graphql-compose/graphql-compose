# Right now just proposal, stay tunned.
See my previous production ready, but unpublished version of mongoose to graphql module: https://github.com/nodkz/graphql-mongoose
By this link you may find example of mash-code in my app, which derived from a map-derived-schema adapters/converters.

🌶🌶🌶 **Just [look on compose API](https://github.com/nodkz/graphql-compose/blob/master/src/metaApiProposal.js) which should be! Look on methods `composeType`, `composeField` and `composeResolve`. Yay!** 🌶🌶🌶 

Long live to middlewares and compose! 
This module `graphql-compose` should be ready in Mid of June.

GraphQL-compose
======================

The `GraphQL-compose` is a module which allow construct flexible graphql schema from different data sources via plugins (Mongoose, DataLoader, Redis, Fetch and so on).
You may extend types, rename fields, reduce access to fields, attach custom logic to resolvers and much more.
Middlewares should solve problem of mash code in schemas, which derived via map configs. 

One more abstraction over graphql for clever peoples ;P for simple life ;).

Here you can see `graphql-compose` blocks and how it will work. 
<img width="677" alt="graphql-composer" src="https://cloud.githubusercontent.com/assets/1946920/15902133/48c56dec-2dc8-11e6-9114-d1e0ee432cfb.png">

Installation
============

`npm install graphql-compose` - it is too early to run this command, module is not ready yet 


Middlewares
===========

### Basics
All `graphql-compose` middlewares have 3 phases: 
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
 

### How `resolveMiddleware` work internally [Promise]
Will be executed for every request, if resolve needed for query serving. 
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

### How `typeMiddleware` works internally [Object]
Will be executed once, when building graphQL schema.
```js
export default function typeMiddleware(opts = {}) {
  // [SETUP PHASE]: here you can process setup `opts`, when you create Middleware
  
  return next => typeConfig => {
    // [CAPTURING PHASE]: 
    // `typeConfig` consist from { name, description, fields, interfaces, isTypeOf } (*type GraphQLObjectTypeConfig*)
    // here you can change `name`, `description`, `fields`, `interfaces`, `isTypeOf` before it will pass to `next` middleware.
    // ...some code which modify params
    
    const type = next(typeConfig); // passing config data to underlying middleware
    
    // [BUBBLING PHASE]: here you may change `type` returned from underlying middlewares.
    
    return type; // return typeConfig to upper middleware 
  };
}
```

### How `fieldMiddleware` works internally [Object]
Will be executed once, when building graphQL schema.
```js
export default function fieldMiddleware(opts = {}) {
  // [SETUP PHASE]: here you can process setup `opts`, when you create Middleware
  
  return next => fieldConfig => {
    // [CAPTURING PHASE]: 
    // `fieldConfig` consist from { type, description, args, resolve, deprecationReason } (*type GraphQLFieldConfig*)
    // here you can change `type`, `description`, `args`, `resolve`, `deprecationReason` before it will pass to `next` middleware.
    // ...some code which modify params
    
    const field = next(fieldConfig); // passing config data to underlying middleware
    
    // [BUBBLING PHASE]: here you may change `field` returned from underlying middlewares.
    
    return field; // return fieldConfig to upper middleware 
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
