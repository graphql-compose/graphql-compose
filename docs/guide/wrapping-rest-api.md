---
id: wrapping-rest-api
title: Wrapping REST API
---

## Intro

Many developers are attracted by GraphQL’s benefits over REST. The reason for that is its query language enabling to stick to the data that the client needs at the moment and not to restructure the client to fit API structure. Single endpoint, but flexible data shape.

Let’s imagine you already have an existing RESTful API, but your task requires using GraphQL either you just want to try it out of curiosity. If that's the case, you would need to wrap your REST in GraphQL Schema and hardcoding all the GraphQL Types is a real pain.

That's why we came up with a RESTful API wrapper for GraphQL featuring automatic `GraphQL Type` generation.

## Installation

```bash
npm install graphql-compose-json
```

## Demo

We've wrapped SWAPI RESTful API in to show capabilities of `graphq-compose-json`

GraphQL SWAPI wrapper source code:

<https://github.com/lyskos97/graphql-compose-swapi>

resulting **LIVE DEMO**:

<https://graphql-compose-swapi.herokuapp.com>

![image](https://user-images.githubusercontent.com/23356069/40114701-baa5dc5a-592f-11e8-9dac-1bfba0f5dca4.png)

### Type Creation

Using `graphql-compose` is easy — it's just one, but helpful function:

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
  mass: () => 'Int!', // by default JSON numbers are coerced to Float, here we've set it to Integer
  starships_count: () => ({ // granular inline field config with resolve function
    type: 'Int',
    resolve: source => source.starships.length,
  }),
};

export const CustomPersonTC = composeWithJson('CustomPerson', restApiResponse);
```

That's it! The Type is ready to be used and have its resolvers defined. `CustomPersonTC` contains all things you need to compose Resolvers and Schema.

### Specifying data fetching method

What we're trying to do is to wrap an existing RESTful API in GraphQL Schema, but it is not yet aware of where the data is stored, it knows only the possible data shape; thus we need to specify how to fetch the API data.

Valid GraphQL data request requires three pieces: `resolve`(data fetching method), `args`(list of acceptable input arguments) and `type`(data representation form, which we already have thanks to `graphql-compose-json`). GraphQL terms label these three a Field Config (or Resolver).

```js
{
  type: PersonGraphQLType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLInt) },
  },
  resolve: async (_, args) => {
    const res = await fetch(`https://swapi.co/api/people/${args.id}/`);
    const person = await res.json();
    return person;
  },
}
```

Fetching several people at once:

```js
{
  type: new GraphQLList(PersonGraphQLType),
  args: {
    page: { type: GraphQLInt, defaultValue: 1 },
  },
  resolve: async (_, args) => {
    const res = await fetch(`https://swapi.co/api/people?page=${args.page}`);
    const people = await res.json();
    return people.results;
  },
}
```

### Relating Types

It's unlikely that the Schema will have only one Type, hence we've got to link our scattered types. Imagine we want `Person` Type to return the list of movies they starred in. Assuming that `Person` has links to them, all we need is to add a resolver to `FilmTC`.

```js
PersonTC.addRelation('films', {
  resolver: () => FilmTC.getResolver('findByUrlList'),
  prepareArgs: {
    urls: source => source.films,
  },
});
```

```js
FilmTC.addResolver({
  name: 'findByUrlList',
  type: [FilmTC],
  resolve: rp => { // `rp` stands for resolve params = { source, args, context, info }
      return Promise.all(rp.args.films.map(async filmUrl => {
        const res = await fetch(filmUrl);
        const film = await res.json();
        return film;
      }));
    },
});
```

Defining Resolvers within `ObjectTypeComposer`s they belong to helps to keep your code DRY, as further on you'll be able to reuse them with just one line of code:

```js
Planet.getResolver('findMany');
```

### Composing the Schema

Now with Types and Resolvers created it's time to put them into Schema.

```js
import { GQC } from 'graphql-compose';
import fetch from 'node-fetch';
import { PersonGraphQLType } from './Person';

GQC.rootQuery().addFields({
  person: {
    type: PersonTC,
    args: {
      id: `Int!`,
    },
    resolve: async (_, args) => {
      const res = await fetch(`https://swapi.co/api/people/${args.id}/`);
      const person = await res.json();
      return person;
    },
  },
};

export const schema = GQC.buildSchema(); // returns `GraphQLSchema`
```

Check out our article describing each step in detail and suggesting some interesting tricks:

[Building GraphQL Schema from RESTful API](https://medium.com/@lyskos97/building-graphql-schema-from-rest-api-ee31ac12c57b)
