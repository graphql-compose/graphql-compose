---
id: generating-schema
title: Generating Schema
---

`SchemaComposer` is a builder of `GraphQLSchema` object. Obtained Schema via `buildSchema()` method may be used in `express-graphql`, `apollo-server` and other libs which uses `GraphQL.js` under the hood for query execution at runtime.

## Create Schema

`SchemaComposer` provides basic root types `Query`, `Mutation`, `Subscription`. You must add fields at least to one of these types, otherwise Schema will not have sense and cannot be build.

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

GraphQL.js does not provide any access rights checks. You should it do manually in `resolve` methods. With `graphql-compose` you may do it via wrapping Resolvers:

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

For getting `isAdmin` property from `context` you must define it in `express-graphql` or `apollo-server`:

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

In some complex scenarios you may need to have several GraphQL Schemas in one app. `Graphql-compose` by default exports following classes/instances for single schema mode:

```js
import { schemaComposer } from 'graphql-compose';
```

But for multi-schema mode you need to import class `SchemaComposer` (starts from upper-case letter `S`) and create instances from it:

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

Types created via `ObjectTypeComposer1` and `ObjectTypeComposer2` will not be visible to each other. So may have different definitions for types with the same name.
