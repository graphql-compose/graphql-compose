---
id: relay
title: [WIP] Relay Schema
---

Adding support for Relay is done via plugin [graphql-compose-relay](https://github.com/nodkz/graphql-compose-relay) For more detailed descriptions on how to use and reporting issues please use the link.

## Importing and installing

Installation:

```bash
npm i -S graphql-compose-relay
```

Importing:

```js
import composeWithRelay from 'graphql-compose-relay';
```

## Add support in TypeComposers

It cant be more simple than this:

```js
export const PersonTC = composeWithRelay(composeMongoose(Person));
```

## Add support in RootQuery

```js
composeWithRelay(GQC.rootQuery());
```
