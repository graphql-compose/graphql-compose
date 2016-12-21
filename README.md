# GraphQL-compose
[![](https://img.shields.io/npm/v/graphql-compose.svg)](https://www.npmjs.com/package/graphql-compose)
[![codecov coverage](https://img.shields.io/codecov/c/github/nodkz/graphql-compose.svg)](https://codecov.io/github/nodkz/graphql-compose)
[![Travis](https://img.shields.io/travis/nodkz/graphql-compose.svg?maxAge=2592000)](https://travis-ci.org/nodkz/graphql-compose)
[![npm](https://img.shields.io/npm/dt/graphql-compose.svg)](https://www.npmjs.com/package/graphql-compose)
[![Join the chat at https://gitter.im/graphql-compose/Lobby](https://badges.gitter.im/nodkz/graphql-compose.svg)](https://gitter.im/graphql-compose/Lobby)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

[GraphQL](http://graphql.org/) – is a query language for APIs. [graphql-js](https://github.com/graphql/graphql-js) is the reference implementation of GraphQL for nodejs which introduce GraphQL type system for describing schema. [express-graphql](https://github.com/graphql/express-graphql) GraphQL HTTP server for fulfilling graphql queries.

**`graphql-compose`** – the tool which is build on top of `graphql-js`. It helps to construct graphql types and schema on the server. The main aim of `graphql-compose` to solve the problem of mash code in schema's files, and ridiculously simplify schema build process on the server.
- provides methods for editing GraphQL output/input types (add/remove fields/args/interfaces)
- introduces `Resolver`s – the named graphql fieldConfigs, which can be used for finding, updating, removing records
- provides an easy way for creating relations between types via `Resolver`s
- provides converter from `OutputType` to `InputType`
- provides `projection` parser from AST
- provides `GraphQL schema language` for defining simple types
- adds additional types `Date`, `Json`


**`graphql-compose-[plugin]`** – plugins that build on top of `graphql-compose` and construct graphql types from some sources/models:
- [graphql-compose-mongoose](https://github.com/nodkz/graphql-compose-mongoose) - build graphql types from mongoose (MongoDB models) with Resolvers
- [graphql-compose-relay](https://github.com/nodkz/graphql-compose-relay) - reassemble GraphQL types with `Relay` specific things, like `Node` type and interface, `globalId`, `clientMutationId`
- [graphql-compose-connection](https://github.com/nodkz/graphql-compose-connection) - generate `connection` Resolver from `findMany` and `count` Resolvers.


## Example
city.js
```js
import composeWithMongoose from 'graphql-compose-mongoose';
import { CountryTC } from './country';

export const CitySchema = new mongoose.Schema({
  name: String,
  population: Number,
  countryCode: String, // US
  tz: String, // 'America/Los_Angeles'
  // ...
});
export const City = mongoose.model('City', CitySchema);
export const CityTC = composeWithMongoose(CityModel);

// Define some additional fields
CityTC.addFields({
  ucName: { // standard GraphQL like field definition
    type: GraphQLString,
    resolve: (source) => source.name.toUpperCase(),
  },
  localTime: { // extended GraphQL Compose field definition
    type: 'Date',
    resolve: (source) => moment().tz(source.tz).format(),
    projection: { tz: true }, // load `tz` from database, when requested only `localTime` field
  },
});

// Add relation between City and Country by `countryCode` field.
CityTC.addRelation( // GraphQL relation definition
  'country',
  () => ({
    resolver: CountryTC.getResolver('findOne'),
    args: {
      filter: source => ({ code: `${source.countryCode}` }),
    },
    projection: { countryCode: true },
  })
);

// Remove `tz` field from schema
CityTC.removeField('tz');

// Add description to field
CityTC.extendField('name', {
  description: 'City name',
});
```

schema.js
```js
import { GQC } from 'graphql-compose';
import { CityTC } from './city';
import { CountryTC } from './country';

GQC.rootQuery().addFields({
  city: CityTC.get('$findOne'),
  cityConnection: CityTC.get('$connection'),
  country: CountryTC.get('$findOne'),
  currentTime: {
    type: 'Date',
    resolve: () => Date.now(),
  },
});

GQC.rootMutation().addFields({
  createCity: CityTC.get('$createOne'),
  updateCity: CityTC.get('$updateById'),
  ...adminAccess({
    removeCity: CityTC.get('$removeById'),
  }),
});

function adminAccess(resolvers) {
  Object.keys(resolvers).forEach((k) => {
    resolvers[k] = resolvers[k].wrapResolve(next => (rp) => {
      // rp = resolveParams = { source, args, context, info }
      if (!rp.context.isAdmin) {
        throw new Error('You should be admin, to have access to this action.');
      }
      return next(rp);
    });
  });
  return resolvers;
}

export default GQC.buildSchema();
```

## Documentation
You can find out documentation here:

[Current version](https://github.com/nodkz/graphql-compose/tree/master/docs)

## Live Demos
- [graphql-compose.herokuapp.com](https://graphql-compose.herokuapp.com/) - Live demo of GraphQL Server (9 models, 14 files, ~750 LOC)
- [nodkz.github.io/relay-northwind](https://nodkz.github.io/relay-northwind) - Live demo of Relay client working with the server above (8 crazy pages, 47 files, ~3000 LOC)


## To-Do list
- [ ] write [DataLoader](https://github.com/facebook/dataloader) resolver's wrapper for reducing number of queries
- [ ] add support for PubSub. Introduce subscriptions to your graphql schemas
- [ ] write `graphql-compose-remote-graphql` module, for building your own types which will resolve from 3rd party graphql servers
- [ ] write `graphql-compose-rest` module, for building your own types which will resolve from 3rd party REST api's. It will be prototype for simple and fast realization of your rest wrappers
- [ ] **[need help]** find somebody who write `graphql-compose-sequilze` module like `graphql-compose-mongoose` (need to write types converter, and change resolver functions).


## License
[MIT](https://github.com/nodkz/graphql-compose/blob/master/LICENSE.md)
