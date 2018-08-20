<p align="center"><img src="https://raw.githubusercontent.com/graphql-compose/graphql-compose/master/docs/logo.png" width="200" /></p>

# GraphQL-compose

[![](https://img.shields.io/npm/v/graphql-compose.svg)](https://www.npmjs.com/package/graphql-compose)
[![codecov coverage](https://img.shields.io/codecov/c/github/graphql-compose/graphql-compose.svg)](https://codecov.io/github/graphql-compose/graphql-compose)
[![Travis](https://img.shields.io/travis/graphql-compose/graphql-compose.svg?maxAge=2592000)](https://travis-ci.org/graphql-compose/graphql-compose)
[![npm](https://img.shields.io/npm/dt/graphql-compose.svg)](http://www.npmtrends.com/graphql-compose)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
![TypeScript compatible](https://img.shields.io/badge/typescript-compatible-brightgreen.svg)
![FlowType compatible](https://img.shields.io/badge/flowtype-compatible-brightgreen.svg)
[![Backers on Open Collective](https://opencollective.com/graphql-compose/backers/badge.svg)](#backers)
[![Sponsors on Open Collective](https://opencollective.com/graphql-compose/sponsors/badge.svg)](#sponsors)

[GraphQL](http://graphql.org/) – is a query language for APIs. [graphql-js](https://github.com/graphql/graphql-js) is the reference implementation of GraphQL for nodejs which introduce GraphQL type system for describing schema _(definition over configuration)_ and executes queries on the server side. [express-graphql](https://github.com/graphql/express-graphql) is a HTTP server which gets request data, passes it to `graphql-js` and returned result passes to response.

**`graphql-compose`** – the _imperative tool_ which worked on top of `graphql-js`. It provides some methods for creating types and GraphQL Models (so I call types with a list of common resolvers) for further building of complex relations in your schema.

* provides methods for editing GraphQL output/input types (add/remove fields/args/interfaces)
* introduces `Resolver`s – the named graphql fieldConfigs, which can be used for finding, updating, removing records
* provides an easy way for creating relations between types via `Resolver`s
* provides converter from `OutputType` to `InputType`
* provides `projection` parser from AST
* provides `GraphQL schema language` for defining simple types
* adds additional types `Date`, `Json`

**`graphql-compose-[plugin]`** – is a _declarative generators/plugins_ that build on top of `graphql-compose`, which take some ORMs, schema definitions and creates GraphQL Models from them or modify existed GraphQL Types.

Type generator plugins:

* [graphql-compose-json](https://github.com/graphql-compose/graphql-compose-json) - generates GraphQL type from JSON (a good helper for wrapping REST APIs)
* [graphql-compose-mongoose](https://github.com/graphql-compose/graphql-compose-mongoose) - generates GraphQL types from mongoose (MongoDB models) with Resolvers.
* [graphql-compose-elasticsearch](https://github.com/graphql-compose/graphql-compose-elasticsearch) - generates GraphQL types from elastic mappings; ElasticSearch REST API proxy via GraphQL.
* [graphql-compose-aws](https://github.com/graphql-compose/graphql-compose-aws) - expose AWS Cloud API via GraphQL

Utility plugins:

* [graphql-compose-relay](https://github.com/graphql-compose/graphql-compose-relay) - reassemble GraphQL types with `Relay` specific things, like `Node` type and interface, `globalId`, `clientMutationId`.
* [graphql-compose-connection](https://github.com/graphql-compose/graphql-compose-connection) - generates `connection` Resolver from `findMany` and `count` Resolvers.
* [graphql-compose-dataloader](https://github.com/stoffern/graphql-compose-dataloader) - add DataLoader to graphql-composer resolvers.

## Documentation

[graphql-compose.github.io](https://graphql-compose.github.io/)

## Live Demos

* [graphql-compose.herokuapp.com](https://graphql-compose.herokuapp.com/) - Live demo of GraphQL Server (9 models, 14 files, ~750 LOC)
* [nodkz.github.io/relay-northwind](https://nodkz.github.io/relay-northwind) - Live demo of Relay client working with the server above (8 crazy pages, 47 files, ~3000 LOC)

## Example

city.js

```js
import { TypeComposer} from 'graphql-compose';
import { CountryTC } from './country';

export const CityTC = TypeComposer.create(`
  type City {
    code: String!
    name: String!
    population: Number
    countryCode: String
    tz: String
  }
`);

// Define some additional fields
CityTC.addFields({
  ucName: { // standard GraphQL like field definition
    type: GraphQLString,
    resolve: (source) => source.name.toUpperCase(),
  },
  currentLocalTime: { // extended GraphQL Compose field definition
    type: 'Date',
    resolve: (source) => moment().tz(source.tz).format(),
    projection: { tz: true }, // load `tz` from database, when requested only `localTime` field
  },
  counter: 'Int', // shortening for only type definition for field
  complex: `type ComplexType {
    subField1: String
    subField2: Float
    subField3: Boolean
    subField4: ID
    subField5: JSON
    subField6: Date
  }`,
  list0: {
    type: '[String]',
    description: 'Array of strings',
  },
  list1: '[String]',
  list2: ['String'],
  list3: [new GraphQLOutputType(...)],
  list4: [`type Complex2Type { f1: Float, f2: Int }`],
});

// Add resolver method
CityTC.addResolver({
  kind: 'query',
  name: 'findMany',
  args: {
    filter: `input CityFilterInput {
      code: String!
    }`,
    limit: {
      type: 'Int',
      defaultValue: 20,
    },
    skip: 'Int',
    // ... other args if needed
  },
  type: [CityTC], // array of cities
  resolve: async ({ args, context }) => {
    return context.someCityDB
      .findMany(args.filter)
      .limit(args.limit)
      .skip(args.skip);
  },
});

// Add relation between City and Country by `countryCode` field.
CityTC.addRelation( // GraphQL relation definition
  'country',
  {
    resolver: () => CountryTC.getResolver('findOne'),
    prepareArgs: {
      filter: source => ({ code: `${source.countryCode}` }),
    },
    projection: { countryCode: true },
  }
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
import { schemaComposer } from 'graphql-compose';
import { CityTC } from './city';
import { CountryTC } from './country';

schemaComposer.Query.addFields({
  cities: CityTC.getResolver('findMany'),
  country: CountryTC.getResolver('findOne'),
  currentTime: {
    type: 'Date',
    resolve: () => Date.now(),
  },
});

schemaComposer.Mutation.addFields({
  createCity: CityTC.getResolver('createOne'),
  updateCity: CityTC.getResolver('updateById'),
  ...adminAccess({
    removeCity: CityTC.getResolver('removeById'),
  }),
});

function adminAccess(resolvers) {
  Object.keys(resolvers).forEach(k => {
    resolvers[k] = resolvers[k].wrapResolve(next => rp => {
      // rp = resolveParams = { source, args, context, info }
      if (!rp.context.isAdmin) {
        throw new Error('You should be admin, to have access to this action.');
      }
      return next(rp);
    });
  });
  return resolvers;
}

export default schemaComposer.buildSchema();
```

## Contributors

This project exists thanks to all the people who contribute.
<a href="graphs/contributors"><img src="https://opencollective.com/graphql-compose/contributors.svg?width=890&button=false" /></a>

## Backers

Thank you to all our backers! 🙏 [[Become a backer](https://opencollective.com/graphql-compose#backer)]

<a href="https://opencollective.com/graphql-compose#backers" target="_blank"><img src="https://opencollective.com/graphql-compose/backers.svg?width=890"></a>

## Sponsors

Support this project by becoming a sponsor. Your logo will show up here with a link to your website. [[Become a sponsor](https://opencollective.com/graphql-compose#sponsor)]

<a href="https://opencollective.com/graphql-compose/sponsor/0/website" target="_blank"><img src="https://opencollective.com/graphql-compose/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/graphql-compose/sponsor/1/website" target="_blank"><img src="https://opencollective.com/graphql-compose/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/graphql-compose/sponsor/2/website" target="_blank"><img src="https://opencollective.com/graphql-compose/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/graphql-compose/sponsor/3/website" target="_blank"><img src="https://opencollective.com/graphql-compose/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/graphql-compose/sponsor/4/website" target="_blank"><img src="https://opencollective.com/graphql-compose/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/graphql-compose/sponsor/5/website" target="_blank"><img src="https://opencollective.com/graphql-compose/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/graphql-compose/sponsor/6/website" target="_blank"><img src="https://opencollective.com/graphql-compose/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/graphql-compose/sponsor/7/website" target="_blank"><img src="https://opencollective.com/graphql-compose/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/graphql-compose/sponsor/8/website" target="_blank"><img src="https://opencollective.com/graphql-compose/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/graphql-compose/sponsor/9/website" target="_blank"><img src="https://opencollective.com/graphql-compose/sponsor/9/avatar.svg"></a>

## License

[MIT](https://github.com/graphql-compose/graphql-compose/blob/master/LICENSE.md)
