---
id: quick-start
title: Quick Start Guide
---

Graphql-compose provides a convenient way to create GraphQL Schema. This schema is completely compatible with [GraphQL.js](https://github.com/graphql/graphql-js).

For comparison with [graphql-tools](https://github.com/apollographql/graphql-tools) let's take its brilliant example "Author <-> User".

## Example data

Let take a look at example data. It consists of two arrays of `authors` and `posts`. Each `post` has a reference `authorId`:

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

For simplicity, this example works with arrays, but in future, it will not be a problem to change data-source to any your favorite DB or a mix of them.

## Creating Types

Building a GraphQL Schema starts with complex Types declaration. In order to create a Type, you have to give it a unique name and specify it’s fields list. So let's create Types which will describe our data. For this purpose need to take `ObjectTypeComposer` helper from `graphql-compose` package.

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

Now as we can declare Types, request them, it’s time to link these Types with each other. This is the exact stage where GraphQL enormously simplifies work for clients that request data. A typical scenario of a query to RESTful API: client requests a piece of data, receives it and request other resources according to the first server response it got, while GraphQL implements the same logic on the server’s side and sends back nested data of any depth.

To make such nesting possible you’ve got to link `Author` and `Post` Types with each other. For that you need to create `author` field in your `Post` Type, it will `resolve` author's data for every post. And for `Author` Type create `posts` field which will resolve for each author its posts.

```js
PostTC.addFields({
  author: {
    // you may provide type name as string 'Author',
    // but for better developer experience use Type instance `AuthorTC`
    // it allows to jump to type declaration via Ctrl+Click in your IDE
    type: AuthorTC,
    // resolve method as first argument will receive data for some Post
    // from this data you should somehow fetch Author's data
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

Now that you’ve got your Types created, linked and taught how to fetch data, it’s time to create your Schema. For this purpose, you will need to use `schemaComposer`. It has three Root Types (entry points): `Query`, `Mutation` and `Subscription` and at least one of them must have defined fields.

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

When your Schema is constructed, it needs to implement a server. It will serve client requests, execute them and send responses back. Let's construct a simple `express` app which will accept `POST` requests at `http://localhost:4000/graphql` endpoint for serving graphql queries. And `GET` requests with same address for providing `GraphiQL` an in-browser IDE for exploring GraphQL.

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

That's all for this small demo. Source code of this example can be found in [graphql-compose-boilerplate](https://github.com/graphql-compose/graphql-compose-boilerplate).

## Screenshots

<img width="922" alt="screen shot 2018-04-26 at 18 03 57" src="https://user-images.githubusercontent.com/1946920/39304724-7310a9d2-497c-11e8-922e-a9caf7d25f3c.png">

<img width="923" alt="screen shot 2018-04-26 at 18 05 11" src="https://user-images.githubusercontent.com/1946920/39304730-765b2f72-497c-11e8-8b2d-728342e4a555.png">

## Bonus Track

Graphql-compose has following built-in scalar types: `String`, `Float`, `Int`, `Boolean`, `ID`, `Date`, `JSON`. If you need to create some complex type, you will need to use `schemaComposer.createObjectTC()`.

Let demonstrate another way of type creation via SDL:

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
