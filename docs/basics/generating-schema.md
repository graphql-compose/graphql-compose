---
id: generating-schema
title: Generating Schema
---

`SchemaComposer` allows to build a `GraphQLSchema` instance. The Schema obtained calling the `buildSchema()` method may be used in `express-graphql`, `apollo-server` and other libs that use `GraphQL.js` under the hood for query execution at runtime.

## Create Schema

`SchemaComposer` provides three basic root types: `Query`, `Mutation` and `Subscription`. It's imperative to initialize at least one of those, otherwise our Schema would not build.

```js
import { schemaComposer } from 'graphql-compose';
import { AuthorTC } from './author';

schemaComposer.Query.addFields({
  // add field with regular FieldConfig
  currentTime: {
    type: 'Date',
    resolve: () => Date.now(),
  },
  // Assume that `AuthorTC` build with `graphql-compose-mongoose` which has CRUD resolvers
  // in such case we can use pre-generated Resolvers as a FieldConfig
  authorById: AuthorTC.getResolver('findById'),
  authorMany: AuthorTC.getResolver('findMany'),
  // ...
});

schemaComposer.Mutation.addNestedFields({
  // also it may be very useful define nested fields
  // Mutation will have `author` field, `author` will have `create` and `update` fields inside
  'author.create': AuthorTC.getResolver('createOne'),
  'author.update': AuthorTC.getResolver('updateById'),
  // ...
});

export default schemaComposer.buildSchema(); // exports GraphQLSchema
```

## Restrict access

GraphQL.js does not provide any access rights checks, so a developer would need to implemented them manually in the `resolve` methods. With `graphql-compose` it can be done by wrapping Resolvers:

```js
// rootMutation.js
import { schemaComposer } from 'graphql-compose';

import { CommentTC } from './comment';
import { UserTC } from './user';

schemaComposer.Mutation.addNestedFields({
  commentCreate: CommentTC.getResolver('createOne'), // may anybody

  ...adminAccess({
    // only for admins
    'user.create': UserTC.getResolver('createOne'),
    'user.update': UserTC.getResolver('updateById'),
    'user.remove': UserTC.getResolver('removeById'),
  }),
});

function adminAccess(resolvers) {
  Object.keys(resolvers).forEach(k => {
    resolvers[k] = resolvers[k].wrapResolve(next => rp => {
      if (!rp.context.isAdmin) {
        throw new Error('You should be admin, to have access to this action.');
      }
      return next(rp);
    });
  });
  return resolvers;
}
```

The `isAdmin` property from the above example must be defined in `express-graphql` or `apollo-server`, in order to retrieve it from `context`:

```js
import express from 'express';
import graphqlHTTP from 'express-graphql';
import { schema } from './schema';

const PORT = 4000;
const app = express();

app.use(
  '/graphql',
  graphqlHTTP(async (request, response, graphQLParams) => {
    return {
      schema,
      graphiql: true,
      context: {
        req: request,
        isAdmin: someMethodForCheckingCookiesOrHeaders(request),
      },
    };
  })
);

app.listen(PORT, () => {
  console.log(`The server is running at http://localhost:${PORT}/graphql`);
});
```

## Multiple Schemas

In some complex scenarios we may need several GraphQL Schemas within a single app. `graphql-compose` by default exports the following classes/instances for single schema mode:

```js
import { schemaComposer } from 'graphql-compose';
```

The equivalent class for multi-schema mode is called `SchemaComposer` (with a capital `S`). Unlike with single-schema where we have a static class, `SchemaComposer` has a constructor and allows creating multiple instances:

```js
import { SchemaComposer } from 'graphql-compose';

const schemaComposer1 = new SchemaComposer();
const ObjectTypeComposer1 = schemaComposer1.createObjectTC(...);

const schemaComposer2 = new SchemaComposer();
const ObjectTypeComposer2 = schemaComposer2.createObjectTC(...);
const InputTypeComposer2 = schemaComposer2.createInputTC(..);
const EnumTypeComposer2 = schemaComposer2.createEnumTC(...);
const UnionTypeComposer2 = schemaComposer2.createUnionTC(...);
const InterfaceTypeComposer2 = schemaComposer2.createInterfaceTC(...);
const ScalarTypeComposer2 = schemaComposer2.createScalarTC(...);
const Resolver2 = schemaComposer2.createResolver(...);
```

Types created via `ObjectTypeComposer1` and `ObjectTypeComposer2` will not be visible to each other: name-clashing and overriding would not be isssues, and multiple definitions for types with the same name are allowed, as long as they live in separate `SchemaComposer` instances.
