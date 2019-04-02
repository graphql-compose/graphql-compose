---
id: plugin-elasticsearch
title: graphql-compose-elasticsearch
sidebar_label: ElasticSearch plugin
---

This module expose Elastic Search REST API via GraphQL.

## Elastic Search REST API proxy

Supported all elastic versions that support official [elasticsearch-js](https://github.com/elastic/elasticsearch-js) client. Internally it parses its source code annotations and generates all available methods with params and descriptions to GraphQL Field Config Map. You may put this config map to any GraphQL Schema.

```js
import { GraphQLSchema, GraphQLObjectType } from 'graphql';
import elasticsearch from 'elasticsearch';
import { elasticApiFieldConfig } from 'graphql-compose-elasticsearch';

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      elastic50: elasticApiFieldConfig(
        // you may provide existed Elastic Client instance
        new elasticsearch.Client({
          host: 'http://localhost:9200',
          apiVersion: '5.0',
        })
      ),

      // or may provide just config
      elastic24: elasticApiFieldConfig({
        host: 'http://user:pass@localhost:9200',
        apiVersion: '2.4',
      }),

      elastic17: elasticApiFieldConfig({
        host: 'http://user:pass@localhost:9200',
        apiVersion: '1.7',
      }),
    },
  }),
});
```

Full [code example](https://github.com/nodkz/graphql-compose-elasticsearch/tree/master/examples/differentVersions)

Live demo of [Introspection of Elasticsearch API via Graphiql](https://graphql-compose.herokuapp.com/elasticsearch/)

---

## ObjectTypeComposer from Elastic mapping

In other side this module is a plugin for [graphql-compose](https://github.com/nodkz/graphql-compose), which derives GraphQLType from your [elastic mapping](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html) generates tons of types, provides all available methods in QueryDSL, Aggregations, Sorting with field autocompletion according to types in your mapping (like Dev Tools Console in Kibana).

Generated ObjectTypeComposer model has several awesome resolvers:

- `search` - greatly simplified elastic `search` method. According to GraphQL adaptation and its projection bunch of params setup automatically due your graphql query (eg `_source`, `explain`, `version`, `trackScores`), other rare fine tuning params moved to `opts` input field.  
- `searchConnection` - elastic `search` method that implements Relay Cursor Connection [spec](https://facebook.github.io/relay/graphql/connections.htm) for infinite lists. Internally it uses cheap [search_after](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-search-after.html) API. One downside, Elastic does not support backward scrolling, so `before` argument will not work.
- more resolvers will be later after my vacation: `suggest`, `getById`, `updateById` and others

```js
import { GraphQLSchema, GraphQLObjectType } from 'graphql';
import elasticsearch from 'elasticsearch';
import { composeWithElastic } from 'graphql-compose-elasticsearch';

const mapping = {
  properties: {
    name: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
        },
      },
    },
    gender: {
      type: 'keyword',
    },
    skills: {
      type: 'text',
    },
    languages: {
      type: 'keyword',
    },
    location: {
      properties: {
        name: {
          type: 'text',
        },
        point: {
          type: 'geo_point',
        },
      },
    },
    createdAt: {
      type: 'date',
    },
  },
};

const UserTC = composeWithElastic({
  graphqlTypeName: 'UserES',
  elasticIndex: 'user',
  elasticType: 'user',
  elasticMapping: mapping,
  elasticClient: new elasticsearch.Client({
    host: 'http://localhost:9200',
    apiVersion: '5.0',
    log: 'trace',
  }),
  // elastic mapping does not contain information about is fields are arrays or not
  // so provide this information explicitly for obtaining correct types in GraphQL
  pluralFields: ['skills', 'languages'],
});

const Schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      user: UserTC.get('$search').getFieldConfig(),
      userConnection: UserTC.get('$searchConnection').getFieldConfig(),
    },
  }),
});
```

Full [code example](https://github.com/nodkz/graphql-compose-elasticsearch/blob/master/examples/elastic50/index.js)

## Installation

```bash
yarn add graphql graphql-compose elasticsearch graphql-compose-elasticsearch
// or
npm install graphql graphql-compose elasticsearch graphql-compose-elasticsearch --save
```

Modules `graphql`, `graphql-compose`, `elasticsearch` are in `peerDependencies`, so should be installed explicitly in your app.

## Screenshots

### API proxy: Raw search method

<img width="1316" alt="screen shot 2017-03-07 at 22 26 17" src="https://cloud.githubusercontent.com/assets/1946920/23859886/61066f40-082f-11e7-89d0-8443aa2ae930.png">

### API proxy: Getting several raw elastic metric in one request

<img width="1314" alt="screen shot 2017-03-07 at 22 34 01" src="https://cloud.githubusercontent.com/assets/1946920/23859892/65e71744-082f-11e7-8c1a-cafeb87e08e6.png">

### Mapping: Relay Cursor Connection

<img width="1411" alt="screen shot 2017-03-22 at 19 34 09" src="https://cloud.githubusercontent.com/assets/1946920/24200219/a058c220-0f36-11e7-9cf1-38394052f922.png">

### Mapping: Generated GraphQL Types and Documentation

<img width="1703" alt="screen shot 2017-03-22 at 19 33 24" src="https://cloud.githubusercontent.com/assets/1946920/24200220/a05944b6-0f36-11e7-9919-39b7001af203.png">

## License

[MIT](https://github.com/nodkz/graphql-compose-elasticsearch/blob/master/LICENSE.md)
