---
id: what-is-resolver
title: Resolvers
---

## What is Resolver?

Shortly, `Resolver` is an object which knows how to process data and what to return. It's like a function definition in static language where you give it `name`, describe types for input `arguments` and output `result`.

`GraphQL.js` describes such functions in [complex output types](https://graphql.org/graphql-js/type/#graphqlobjecttype) via `GraphQLFieldConfig`:

```js
type GraphQLFieldConfig = {
  type: GraphQLOutputType;
  args?: GraphQLFieldConfigArgumentMap;
  resolve?: GraphQLFieldResolveFn;
  deprecationReason?: string;
  description?: ?string;
}
```

`GraphQLFieldConfig` has information about returned `type`, available `args`, implementation of `resolve` logic and some other properties. In terms of `graphql-compose` this field config is called as `Resolver`.

The main aim of `Resolver` is to keep available resolve methods for `Type` and use them for building relation with other types. Resolver provide following abilities:

- add, remove, get, make optional/required arguments
- clone Resolver for further logic extension
- wrap `args`, `type`, `resolve` (get resolver and create new one with extended/modified functionality)
- provide helper methods `addFilterArg` and `addSortArg` which wrap resolver by adding argument and additional `resolve` logic

`Resolver` has following properties:

- `type` output complex or scalar type (resolver returns data of this type)
- `args` list of fields of input or scalar types (resolver accept input arguments for resolve method)
- `resolve` method which contains your bussiness logic, for fetching, processing and returning data. **BE AWARE:** that all arguments (source, args, context, info) are passed inside one argument called as `resolveParams` (`rp` for brevity in the code).
- `description` public description which will be passed to graphql schema and will be available via introspection
- `deprecationReason` if you want to hide field from schema, but leave it working for old clients
- `name` any name for resolver that allow to you identify what it does, eg `findById`, `updateMany`, `removeOne`
- `kind` type of resolver `query` (resolver just fetch data) or `mutation` (resolver change data)
- `parent` you may wrap existed `Resolver` for adding additional checks, modifying result, adding arguments. This property keeps reference to existed unwrapped Resolver

## Why do we need the Resolver?

Graphql-compose allows creating such "functions" or "FieldConfigs" via giving it names and keep in your `ObjectTypeComposer`. You may create any number of `Resolvers` and store them in your type.

Assume you have an `Author` type. And you have different standard CRUD operations for fetching and modifying this type:

- findById
- findMany
- updateById
- removeById
- etc

When you will construct your Schema, you may need several times the same logic from standard Resolvers. For example

- in the `Query` type may be added fields
  - `authorById` for finding Author by `id` arg via `findById` resolver
  - `authorMany` for finding list of Author with some filter criteria via `findMany` resolver
- in the `Post` type may be added
  - `author` field which request Author by `id` from current `post.authorId` value via `findById` resolver
  - `reviewers` field which request Authors via `findMany` resolver with custom filtering

`Resolver`s helps to describe CRUD operations logic only once and then reuse them in different scenarios. For `Query.authorById` provides its full functionality from `findById` resolver. For `Post.author` you wrap `findById` resolver where should be hidden `id` arg and its value automatically will be set from `post.authorId`. For wrapping Resolvers `graphql-compose` provides a bunch of methods.

## Creating Resolver

### via `TC.addResolver()`

Mostly `Resolver`s are created according to the specific `Type`. So it's better to create them and store in some `ObjectTypeComposer` instance.

Lets's take `AuthorTC` and describe how it can be found by `id`:

```js
AuthorTC.addResolver({
  name: 'findById',
  args: { id: 'Int' },
  type: AuthorTC,
  resolve: async ({ source, args }) => {
    const res = await fetch(`/endpoint/${args.id}`); // or some fetch from any database
    const data = await res.json();
    // here you may clean up `data` response from API or Database,
    // it should has same shape like AuthorTC fields
    // eg. { firstName: 'Peter', nickname: 'peet', views: 20 }
    // if some fields in `data`:
    //    are undefined or missing - graphql returns `null` for that fields
    //    are not described in output `type` - graphql will remove them from responce
    return data;
  },
});
```

And in any place of your schema you will able to use this `Resolver` in such way:

```js
schemaComposer.Query.addFields({
  authorById: AuthorTC.getResolver('findById'),
});
```

### via `schemaComposer.createResolver()`

You may create instance of `Resolver` without attaching it to some `ObjectTypeComposer`. It can be done in following way:

```js
import { schemaComposer } from 'graphql-compose';

const findCityLocationByIdResolver = schemaComposer.createResolver({
  name: 'findCityLocationById',
  type: `type CityLocation { lon: Float, lat: Float }`,
  args: {
    id: 'Int!',
  },
  // BE AWARE! `resolve` method in `Resolver` accept only one argument `resolveParams`
  // which contains
  //   standard properties from `GraphQLFieldResolveFn`: source, args, context, info
  //   and additional properties: projection
  resolve: async ({ source, args, context, info }) => {
    const city = await DB.city.findById(args.id);
    if (!city) return null;
    return {
      lon: city.longitude,
      lat: city.latitude,
    };
  }
});

// And add this resolver to your Schema
schemaComposer.Query.addFields({
  cityLocation: findCityLocationByIdResolver,
});
```

## Wrapping Resolver

In many cases, it is very convenient to create a `Resolver` which just fetch data providing rich `filter` and `sort` arguments (also it may modify data).
But what if we need to restrict access or set up some arguments of Resolver from `source` (parent) object or `context`?

Yep, you need to wrap the Resolver! Wrap just `resolve` method via `Resolver.wrapResolve()`. Or `Resolver.wrap()` if we want to change simultaneously output `type`, `args` and `resolve` method.

### via `Resolver.wrapResolve()`

The most commonly used method for wrapping is `Resolver.wrapResolve()`. Let take a look how can be it used in your `Schema`:

```js
schemaComposer.Query.addFields({
  // add endpoint which returns only visible posts
  publicPosts: PostTC.getResolver('findMany').wrapResolve(next => rp => {
    // assume that your basic `findMany` resolver has `visibility` argument
    // so forcibly set this arg to true
    rp.args.visibility = true;
    // after that delegate finding to basic `findMany` with modified resolveParams
    return next(rp);
  });

  // add endpoint which returns posts only for current authenticated user
  ownerPosts: PostTC.getResolver('findMany').wrapResolve(next => rp => {
    // assume that your basic `findMany` resolver has `authorId` argument
    // so forcibly set this arg to current user id
    rp.args.authorId = rp.context.currentUserId;
    // after that delegate finding to basic `findMany` with modified resolveParams
    return next(rp);
  });

  // add endpoint which returns all authors only for admin
  allAuthorsForAdmin: AuthorTC.getResolver('findMany').wrapResolve(next => rp => {
    // check `isAdmin` property in context, which was somehow setted
    // on express-graphql or apollo-server level
    // for regular user return null
    if (!rp.context.isAdmin) return null;
    // for admin delegate execution to the basic resolver
    return next(rp);
  });
});
```

### via `Resolver.wrap()`

This is a less-used method. But it's more powerfull. It allows to change simultaneously output `type`, `args` and `resolve` method.

What if `admin` should have all avaliable `filter` params and add new one for searching but `regular user` just limited set of arguments?

Resolver wrapping creates a new Resolver. So for `admin` you create a new resolver `findManyForAdmin` by wrapping a basic resolver, eg. `findMany` add additional args and logic. For `user` you create `findManyReduced` by wrapping existed `findMany` resolver and removing some filter args.

Let write reduced resolver `findManyReduced`, where we remove some args

```js
const findManyReduced = AuthorTC.getResolver('findMany').wrap(newResolver => {
  // for new created resolver, clone its `filter` argument with a new name
  newResolver.cloneArg('filter', 'AuthorFilterForUsers');
  // remove some filter fields to which regular users should not have access
  newResolver.getArgTC('filter').removeFields(['age', 'other_sensetive_filter']);
  // and return modified resolver with new set of args
  return newResolver;
});
```

### via `TC.wrapResolverAs()`

Also you may want to modify already existed `Resolver` in some `ObjectTypeComposer`, like it did `Resolver.wrap()` method.

For simplifying this process you may use `ObjectTypeComposer.wrapResolverAs()` method.
Let take `AuthorTC`s `findMany` resolver and create a new one with name `findManyReduced`.

```js
AuthorTC.wrapResolverAs('findManyReduced', 'findMany', newResolver => {
  // for new created resolver, clone its `filter` argument with a new name
  newResolver.cloneArg('filter', 'AuthorFilterForUsers');
  // remove some filter fields to which regular users should not have access
  newResolver.getArgTC('filter').removeField(['age', 'other_sensetive_filter']);
  // and return modified resolver with new set of args
  return newResolver;
});
```

## Advanced

### How `Resolver.wrapResolve()` work internally

- `capturing phase`, when you may change `resolveParams` (`rp` in the code) before it will pass to next `resolve`
- `bubbling phase`, when you may change response from underlying `resolve`

```js
Resolver.wrapResolve(next => rp => {
  // [CAPTURING PHASE]:
  // `rp` consist from { source, args, context, info, projection }
  // you may change `source`, `args`, `context`, `info`, `projection` before it will pass to `next` underlying resolve function.

  // ...some code which modify `rp` (resolveParams)

  // ... or just stop propagation
  //   throw new Error();
  //   or
  //   return Promise.resolve(null);

  // pass request to underlying middleware and get result promise from it
  const resultPromise = next(rp);

  // [BUBBLING PHASE]: here you may change payload of underlying resolve method, via promise syntax
  // ...some code, which may add `then()` or `catch()` to result promise
  //    resultPromise.then(payload => { console.log(payload); return payload; })

  return resultPromise; // return payload promise to upper wrapper
});
```

Several sequential `wrapResolve`

```js
Resolver.wrapResolve(M1).wrapResolve(M2);
```

working work such way:

- call capture phase of `M2` (changing `resolveParams`)
- call capture phase of `M1` (changing `resolveParams`)
- call initial `resolve` method
- call bubbling phase of `M1` (changing `result`)
- call bubbling phase of `M2` (changing `result`)
- pass `result` to `graphql` runner.
