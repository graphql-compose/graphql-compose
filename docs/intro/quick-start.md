---
id: quick-start
title: Quick Start Guide
---

Graphql-compose provides a convenient way to create GraphQL Schema. This schema is completely compatible with [GraphQL.js](https://github.com/graphql/graphql-js).

For comparison with [graphql-tools](https://github.com/apollographql/graphql-tools) let's take its brilliant example "Author <-> User".

## Example data

Let's take a look at some example data. It consists of two arrays of `authors` and `posts`. Each `post` has a reference field `authorId`:

```js
const authors = [
  { id: 1, firstName: 'Tom', lastName: 'Coleman' },
  { id: 2, firstName: 'Sashko', lastName: 'Stubailo' },
  { id: 3, firstName: 'Mikhail', lastName: 'Novikov' },
];

const posts = [
  { id: 1, authorId: 1, title: 'Introduction to GraphQL', votes: 2 },
  { id: 2, authorId: 2, title: 'Welcome to Apollo', votes: 3 },
  { id: 3, authorId: 2, title: 'Advanced GraphQL', votes: 1 },
  { id: 4, authorId: 3, title: 'Launchpad is Cool', votes: 7 },
];
```

For simplicity this example works with arrays, but in the future, it will not be a problem to change data-source to any of your favorite DBs or use a mix of them.

## Creating Types

Building a GraphQL Schema starts with complex Types declaration. In order to create a Type, you have to give it a unique name and specify its fields list. So let's create some Types to describe our data. For this purpose we need to import the `ObjectTypeComposer` helper from the `graphql-compose` package.

```js
import { schemaComposer } from 'graphql-compose';

const AuthorTC = schemaComposer.createObjectTC({
  name: 'Author',
  fields: {
    id: 'Int!',
    firstName: 'String',
    lastName: 'String',
  },
});

const PostTC = schemaComposer.createObjectTC({
  name: 'Post',
  fields: {
    id: 'Int!',
    title: 'String',
    votes: 'Int',
    authorId: 'Int',
  },
});
```

## Create relations between Types

Now that we have declared Types, it’s time to link them with each other. This is the exact stage where GraphQL enormously simplifies work for clients that request data. A typical scenario when using a RESTful API goes like this: a client requests some data, and tipically makes a second or even third request based on the previous response. GraphQL allows to perform a single deeply nested query, composing the result on the server’s side and sending it back to the client.

To make such nesting possible we need to link `Author` and `Post` Types with each other. For that we will define an `author` field in your `Post` Type, which will allow GraphQL to `resolve` the author's data for every post. And for `Author` Type we will define a `posts` field to make retrieving each `Author`'s posts possible.

```js
PostTC.addFields({
  author: {
    // you may provide the type name as a string (eg. 'Author'),
    // but for better developer experience you should use a Type instance `AuthorTC`.
    // This allows jumping to the type declaration via Ctrl+Click in your IDE
    type: AuthorTC,
    // resolve method as first argument will receive data for some Post.
    // From this data you should then fetch Author's data.
    // let's take lodash `find` method, for searching by `authorId`
    // PS. `resolve` method may be async for fetching data from DB
    // resolve: async (source, args, context, info) => { return DB.find(); }
    resolve: post => find(authors, { id: post.authorId }),
  },
});

AuthorTC.addFields({
  posts: {
    // Array of posts may be described as string in SDL in such way '[Post]'
    // But graphql-compose allow to use Type instance wrapped in array
    type: [PostTC],
    // for obtaining list of post we get current author.id
    // and scan and filter all Posts with desired authorId
    resolve: author => filter(posts, { authorId: author.id }),
  },
  postCount: {
    type: 'Int',
    description: 'Number of Posts written by Author',
    resolve: author => filter(posts, { authorId: author.id }).length,
  },
});
```

## Building Schema

Now that we have our Types created, linked and we've seen how to fetch data, it’s time to create our Schema. For this purpose, we will need to use `schemaComposer`. It has three Root Types (entry points): `Query`, `Mutation` and `Subscription` and at least one of them must have defined fields.

```js
import { schemaComposer } from 'graphql-compose';

// Requests which read data put into Query
schemaComposer.Query.addFields({
  posts: {
    type: '[Post]',
    resolve: () => posts,
  },
  author: {
    type: 'Author',
    args: { id: 'Int!' },
    resolve: (_, { id }) => find(authors, { id }),
  },
});

// Requests which modify data put into Mutation
schemaComposer.Mutation.addFields({
  upvotePost: {
    type: 'Post',
    args: {
      postId: 'Int!',
    },
    resolve: (_, { postId }) => {
      const post = find(posts, { id: postId });
      if (!post) {
        throw new Error(`Couldn't find post with id ${postId}`);
      }
      post.votes += 1;
      return post;
    },
  },
});

// After Root type definition, you are ready to build Schema
// which should be passed to `express-graphql` or `apollo-server`
export const schema = schemaComposer.buildSchema();
```

## Creating HTTP server

After constructing a Schema, let's see how to implement a server to handle client requests and send back responses using GraphQL. Let's construct a simple `express` app which will accept `POST` requests at the `http://localhost:4000/graphql` endpoint, handling graphql queries. Our app will also accept `GET` requests at the same address, providing an in-browser IDE for exploring GraphQL called `GraphiQL`.

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
      },
    };
  })
);

app.listen(PORT, () => {
  console.log(`The server is running at http://localhost:${PORT}/graphql`);
});
```

## Source code

That's all for this small demo. Source code of this example can be found at [graphql-compose-boilerplate](https://github.com/graphql-compose/graphql-compose-boilerplate).

## Screenshots

<img width="922" alt="screen shot 2018-04-26 at 18 03 57" src="https://user-images.githubusercontent.com/1946920/39304724-7310a9d2-497c-11e8-922e-a9caf7d25f3c.png">

<img width="923" alt="screen shot 2018-04-26 at 18 05 11" src="https://user-images.githubusercontent.com/1946920/39304730-765b2f72-497c-11e8-8b2d-728342e4a555.png">

## Bonus Track

Graphql-compose has the following built-in scalar types: `String`, `Float`, `Int`, `Boolean`, `ID`, `Date`, `JSON`. If we need to create a complex type, we will need to use `schemaComposer.createObjectTC()`.

Let's see another way of creating a type via SDL:

```js
const AddressTC = schemaComposer.createObjectTC(`
  type Address {
    city: String
    country: String
    street: String
  }
`);

// and now we can extend existed Author Type with a new field with complex type
AuthorTC.addFields({
  address: {
    type: AddressTC, // or 'Address'
    description: "Author's address",
  },
})
```

More useful information about type creation can be found [here](basics/understanding-types.md).
