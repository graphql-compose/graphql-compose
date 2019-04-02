---
id: file-uploads
title: File uploads
---

## Intro

If you decide how to upload files via some REST endpoint or GraphQL. So I recommend to upload via some REST API and then provide a path of the uploaded file to your mutation request. GraphQL designed to provide typed data according to client request shape. With files (binary data) it works too, but better to do it via well-recommended REST calls. In such case, you separate highly costed upload logic from data manipulation logic. In the future, this will help you diagnose problems with the load more easily.

Anyway products have different scenarios and you may be forced to upload files via GraphQL. For uploading files via GraphQL you will need:

- [graphql-multipart-request-spec](https://github.com/jaydenseric/graphql-multipart-request-spec)  - will be good if you get acquainted with this spec
- [apollo-upload-server](https://github.com/jaydenseric/apollo-upload-server) - for parsing `multipart/form-data` POST requests via [busboy](https://github.com/mscdex/busboy) and providing `File`s data to `resolve` function as argument.

## Tutorial

### 1. Preparing `express-graphql` server

This is most important part of enabling file uploads on server-side. You need to parse body data via `bodyParser.json()` and multipart form data via `apolloUploadExpress(/* Options */)`.

```diff
import express from 'express';
import graphqlHTTP from 'express-graphql';
+ import bodyParser from 'body-parser';
+ import { apolloUploadExpress } from 'apollo-upload-server';
import { schema } from './schema';

const PORT = 4000;
const app = express();

app.use(
  '/graphql',
+   bodyParser.json(),
+   apolloUploadExpress(/* Options */),
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
```

### 2. Adding `GraphQLUpload` scalar type to `graphql-compose`

You may add 3rd part GraphQL types to `graphql-compose`. And make it very easy:

```js
import { ObjectTypeComposer, schemaComposer } from 'graphql-compose';
import { GraphQLUpload } from 'apollo-upload-server';

schemaComposer.set('Upload', GraphQLUpload);
```

### 3. Writing you first mutation with file uploads

`graphql-compose` supports very convinient syntaxt of field definitions. Let's write our first mutation with file uploads:

```js
schemaComposer.Mutation.addFields({
  createPost: {
    type: 'Post',
    args: {
      id: 'Int!',
      title: 'String',
      authorId: 'Int',
      images: '[Upload]',
      poster: 'Upload',
    },
    resolve: async (_, { id, title, authorId, images, poster }) => {
      const newPost = { id, title, authorId };

      // somehow work with files
      if (poster) {
        console.log(poster);
        console.log(await poster);
      }

      // somehow save a new record
      posts.push(newPost);

      return newPost;
    },
  },
});
```

### 4. Properly sending files from the client

This is a most problematic part and it's out of scope of `graphql-compose` (it's client-side problem). You must correctly send HTTP request from the client. But if you very carefully read [graphql-multipart-request-spec](https://github.com/jaydenseric/graphql-multipart-request-spec), then you should not have any questions.

Here's an example of proper `multipart/form-data` POST request with

- `operations` key for GraphQL request with `query` and `variables`
- `map` key with mapping some `multipart-data` to exact GraphQL variable
- and other keys for `multipart-data` which contains binary data of files

**Request via CURL**

```bash
curl localhost:4000/graphql \
  -F operations='{ "query": "mutation ($poster: Upload) { createPost(id: 5, poster: $poster) { id } }", "variables": { "poster": null } }' \
  -F map='{ "0": ["variables.poster"] }' \
  -F 0=@package.json
```

**Request via Altair**

[Altair GraphQL Client](https://altair.sirmuel.design/) supports [file upload using the graphql-multipart-request-spec](https://sirmuel.design/working-with-file-uploads-using-altair-graphql-d2f86dc8261f) so you can also use it to make a request.

**Response from GraphQL server**

```bash
{"data":{"createPost":{"id":5}}}
```

**Request via POSTMAN**

<img width="728" alt="screen shot 2018-07-05 at 14 51 08" src="https://user-images.githubusercontent.com/1946920/42312868-2dfda7dc-8063-11e8-8a93-13f5b170913b.png">

**Console log on the server side**

```bash
Argument `poster` is a Promise:
Promise {
  { stream:
   FileStream {
     _readableState: [Object],
     readable: true,
     domain: null,
     _events: [Object],
     _eventsCount: 2,
     _maxListeners: undefined,

     truncated: false,
     _read: [Function] },
  filename: 'package.json',
  mimetype: 'application/octet-stream',
  encoding: '7bit' } }

It's value is and object with FileStream:
{ stream:
   FileStream {
     _readableState:
      ReadableState {
        objectMode: false,
        highWaterMark: 16384,
        buffer: [Object],
        length: 1983,
        pipes: null,
        pipesCount: 0,
        flowing: null,
        ended: true,
        endEmitted: false,
        reading: false,
        sync: false,
        needReadable: false,
        emittedReadable: true,
        readableListening: false,
        resumeScheduled: false,
        destroyed: false,
        defaultEncoding: 'utf8',
        awaitDrain: 0,
        readingMore: false,
        decoder: null,
        encoding: null },
     readable: true,
     domain: null,
     _events: { end: [Array], limit: [Object] },
     _eventsCount: 2,
     _maxListeners: undefined,
     truncated: false,
     _read: [Function] },
  filename: 'package.json',
  mimetype: 'application/octet-stream',
  encoding: '7bit' }
```

## Demo Repo

You may take a look at [graphql-compose-boilerplate-upload](https://github.com/graphql-compose/graphql-compose-boilerplate-upload) and its easy to follow [commits](https://github.com/graphql-compose/graphql-compose-boilerplate-upload/commits/master) for understanding how to allow file uploads in `graphql-compose`.
