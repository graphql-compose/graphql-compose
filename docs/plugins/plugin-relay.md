---
id: plugin-relay
title: graphql-compose-relay
sidebar_label: Relay plugin
---

This is a plugin for [graphql-compose](https://github.com/graphql-compose/graphql-compose), which wraps GraphQL types with Relay specific things, like `Node` type and interface, `globalId`, `clientMutationId`.

Live demo: [https://graphql-compose.herokuapp.com/](https://graphql-compose.herokuapp.com/)

[CHANGELOG](https://github.com/graphql-compose/graphql-compose-relay/blob/master/CHANGELOG.md)

## Installation

```bash
npm install graphql graphql-compose graphql-compose-relay --save
```

Modules `graphql` and `graphql-compose` are in `peerDependencies`, so should be installed explicitly in your app. They have global objects and should not have ability to be installed as submodule.

## Example

`ObjectTypeComposer` is a [graphql-compose](https://github.com/graphql-compose/graphql-compose) utility, that wraps GraphQL types and provide bunch of useful methods for type manipulation.

```js
import composeWithRelay from 'graphql-compose-relay';
import { ObjectTypeComposer } from 'graphql-compose';
import { RootQueryType, UserType } from './my-graphq-object-types';

const rootQueryTypeComposer = new ObjectTypeComposer(RootQueryType);
const userTypeComposer = new ObjectTypeComposer(UserType);

// If passed RootQuery, then will be added only `node` field to this type.
// Via RootQuery.node you may find objects by globally unique ID among all types.
composeWithRelay(rootQueryTypeComposer);

// Other types, like User, will be wrapped with middlewares that:
// - add relay's id field. Field will be added or wrapped to return Relay's globally unique ID.
// - for mutations will be added clientMutationId to input and output objects types
// - this type will be added to NodeInterface for resolving via RootQuery.node
composeWithRelay(userTypeComposer);
```

That's all!

All mutations resolvers' arguments will be placed into `input` field, and added `clientMutationId`. If `input` fields already exists in resolver, then  `clientMutationId` will be added to it, rest argument stays untouched. Accepted value via `args.input.clientMutationId` will be transfer to `payload.clientMutationId`, as Relay required it.

To all wrapped Types with Relay, will be added `id` field or wrapped, if it exist already. This field will return globally unique ID among all types in the following format `base64(TypeName + ':' + recordId)`.  

For `RootQuery` will be added `node` field, that will resolve by globalId only that types, which you wrap with `composeWithRelay`.

All this annoying operations is too fatigue to do by hands. So this middleware done all Relay magic implicitly for you.

## Requirements

Method `composeWithRelay` accept `ObjectTypeComposer` as input argument. So `ObjectTypeComposer` should meet following requirements:

- has defined `recordIdFn` (function that from object of this type, returns you id for the globalId construction)
- should have `findById` resolver (that will be used by `RootQuery.node`)

If something is missing `composeWithRelay` throws error.

## License

[MIT](https://github.com/graphql-compose/graphql-compose-relay/blob/master/LICENSE.md)
