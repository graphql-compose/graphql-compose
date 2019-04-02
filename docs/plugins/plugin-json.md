---
id: plugin-json
title: graphql-compose-json
sidebar_label: Json plugin
---

This is a plugin for [graphql-compose](https://github.com/nodkz/graphql-compose), which generates GraphQLTypes from REST response or any JSON. It takes fields from object, determines their types and construct GraphQLObjectType with same shape.

## Demo

We have a [Live demo](https://graphql-compose-swapi.herokuapp.com/?query=%7B%0A%20%20person%28id%3A%201%29%20%7B%0A%20%20%20%20name%0A%20%20%20%20films%20%7B%0A%20%20%20%20%20%20title%0A%20%20%20%20%20%20release_date%0A%20%20%20%20%20%20director%0A%20%20%20%20%7D%0A%20%20%20%20homeworld%20%7B%0A%20%20%20%20%20%20name%0A%20%20%20%20%20%20climate%0A%20%20%20%20%20%20diameter%0A%20%20%20%20%7D%0A%20%20%20%20starships%20%7B%0A%20%20%20%20%20%20name%0A%20%20%20%20%20%20cost_in_credits%0A%20%20%20%20%7D%0A%20%20%7D%0A%7D%0A) (source code [repo](https://github.com/lyskos97/graphql-compose-swapi)) which shows how to build an API upon [SWAPI](https://swapi.co) using `graphql-compose-json`.

## Installation

```bash
npm install graphql graphql-compose graphql-compose-json --save
```

Modules `graphql`, `graphql-compose`, are located in `peerDependencies`, so they should be installed explicitly in your app. They have global objects and should not have ability to be installed as submodule.

## Example

You have a sample response object `restApiResponse` which you can pass to `graphql-compose-json` along with desired type name as your first argument and it will automatically generate a composed GraphQL type `PersonTC`.

```js
// person.js

import composeWithJson from 'graphql-compose-json';

const restApiResponse = {
  name: 'Anakin Skywalker',
  birth_year: '41.9BBY',
  gender: 'male',
  mass: 77,
  homeworld: 'https://swapi.co/api/planets/1/',
  films: [
    'https://swapi.co/api/films/5/',
    'https://swapi.co/api/films/4/',
    'https://swapi.co/api/films/6/',
  ],
  species: ['https://swapi.co/api/species/1/'],
  starships: [
    'https://swapi.co/api/starships/59/',
    'https://swapi.co/api/starships/65/',
    'https://swapi.co/api/starships/39/',
  ],
};

export const PersonTC = composeWithJson('Person', restApiResponse);
export const PersonGraphQLType = PersonTC.getType();
```

## Customization

You can write custom field configs directly to a field of your API response object via function (see `mass` and `starships_count` field):

```js
import composeWithJson from 'graphql-compose-json';

const restApiResponse = {
  name: 'Anakin Skywalker',
  birth_year: '41.9BBY',
  starships: [
    'https://swapi.co/api/starships/59/',
    'https://swapi.co/api/starships/65/',
    'https://swapi.co/api/starships/39/',
  ],
  mass: () => 'Int!', // by default JSON numbers coerced to Float, here we set up Int
  starships_count: () => ({ // more granular field config with resolve function
    type: 'Int',
    resolve: source => source.starships.length,
  }),
};

export const CustomPersonTC = composeWithJson('CustomPerson', restApiResponse);
export const CustomPersonGraphQLType = CustomPersonTC.getType();
```

Will be produced following GraphQL Type from upper shape:

```js
const CustomPersonGraphQLType = new GraphQLObjectType({
  name: 'CustomPerson',
  fields: () => {
    name: {
      type: GraphQLString,
    },
    birth_year: {
      type: GraphQLString,
    },
    starships: {
      type: new GraphQLList(GraphQLString),
    },
    mass: {
      type: GraphQLInt,
    },
    starships_count: {
      type: GraphQLInt,
      resolve: source => source.starships.length,
    },
  },
});
```

## Schema building

Now when you have your type built, you may specify the schema and data fetching method:

```js
// schema.js
import { GraphQLSchema, GraphQLObjectType, GraphQLNonNull, GraphQLInt } from 'graphql';
import fetch from 'node-fetch';
import { PersonTC } from './person';

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      person: {
        type: PersonTC.getType(), // get GraphQL type from PersonTC
        args: {
          id: {
            type: new GraphQLNonNull(GraphQLInt),
          }
        },
        resolve: (_, args) =>
          fetch(`https://swapi.co/api/people/${args.id}/`).then(r => r.json()),
      },
    },
  }),
});
```

Or do the same via `graphql-compose`:

```js
import { GQC } from 'graphql-compose';

GQC.rootQuery().addFields({
  person: {
    type: PersonTC,
    args: {
      id: `Int!`, // equals to `new GraphQLNonNull(GraphQLInt)`
    },
    resolve: (_, args) =>
      fetch(`https://swapi.co/api/people/${args.id}/`).then(r => r.json()),
  },
}

const schema = GQC.buildSchema(); // returns GraphQLSchema
```

## Building schema asynchronously

To build the schema at the runtime, you should rewrite the `Schema.js` and insert there an async function which will return a promise:

```js
export const buildAsyncSchema = async (): Promise<GraphQLSchema> => {
  const url = `https://swapi.co/api/people/1`;
  const data = await fetch(url);
  const jsonData = await data.json();

  const PeopleTC = composeWithJson('People', jsonData);
  PeopleTC.addResolver({
    name: 'findById',
    type: PeopleTC,
    args: {
      id: 'Int!',
    },
    resolve: rp => {
      return fetch(`https://swapi.co/api/people/${rp.args.id}/`).then(r => r.json());
    },
  });

  GQC.rootQuery().addFields({
    person: PeopleTC.getResolver('findById'),
  });

  const schema = GQC.buildSchema();
  return schema;
};
```

So, you can just import this function and tell to the `express-graphql` that we are passing a promise:

```js
import express from 'express';
import graphqlHTTP from 'express-graphql';
import { buildAsyncSchema } from './Schema';

const PORT = 4000;
const app = express();
const promiseSchema = buildAsyncSchema();

app.use(
  '/graphql',
  graphqlHTTP(async req => ({
    schema: await promiseSchema,
    graphiql: true,
    context: req,
  }))
);
```

## Further customization with `graphql-compose`

Moreover, `graphql-compose` allows you to pass pre-defined resolvers of other types to the response object and customize them:

```js
const restApiResponse = {
  name: 'Anakin Skywalker',
  starships: () =>
    StarshipTC.getResolver('findByUrlList') // get some standard resolver
      .wrapResolve(next => rp => { // wrap with additional logic
        const starshipsUrls = rp.source.starships;
        rp.args.urls = starshipsUrls; // populate `urls` arg from source
        return next(rp); // call standard resolver
      })
      .removeArg('urls'), // remove `urls` args from resolver and schema
  };
}

const PersonTC = composeWithJson('Person', restApiResponse);
```

In case you need to separate custom field definition from your response object there are `graphql-compose` methods made for this purpose.

If you want to specify new fields of your type, simply use the `addFields` method of `graphql-compose`:

```js
PersonTC.addFields({
  vehicles_count: {
    type: 'Int!', // equals to `new GraphQLNonNull(GraphQLInt)`
    resolve: (source) => source.vehicles.length,
  },
});
```

When you want to create a relation with another type simply use `addRelation` method of `graphql-compose`:

```js
PersonTC.addRelation('filmObjects', {
  resolver: () => FilmTC.getResolver('findByUrlList'),
  prepareArgs: {
    urls: source => source.films,
  },
});
```

`graphql-compose` provides a vast variety of methods for `fields` and `resolvers` (aka field configs in vanilla `GraphQL`) management of `GraphQL` types. To learn more visit [graphql-compose repo](https://github.com/nodkz/graphql-compose).

## License

[MIT](https://github.com/graphql-compose/graphql-compose-json/blob/master/LICENSE.md)
