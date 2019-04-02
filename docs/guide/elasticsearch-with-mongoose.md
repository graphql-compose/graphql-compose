---
id: elasticsearch-with-mongoose
title: [WIP] Use ElasticSearch with Mongoose
---

**Working DRAFT**

Connect MongoDB with ElasticSearch and GraphQL quite complex and long task and consist of a bunch of steps. Every step can be tuned for your needs.

## 1. Extending Mongoose ORM with elasticsearch data

For working with MongoDB collections and documents is good practice to use some ORM. For nodejs better solution is `mongoose`. Also exists cool [mongoose-elasticsearch-xp](https://github.com/jbdemonte/mongoose-elasticsearch-xp) (by @jbdemonte) package (plugin for mongoose) which provides useful methods and hooks which ridiculously simplify data syncing with MongoDB and ElasticSearch.

### 1.1. Defining Mongoose schema with settings for elasticsearch-xp [SCHEMA DEFINITION]

```js
import mongoose, { Schema } from 'mongoose';
import mongooseElasticsearch from 'mongoose-elasticsearch-xp';

// Embedded schema
const SalaryRangeSchema = new Schema(
  {
    from: {
      type: Number,
      es_indexed: true, // mongoose-elasticsearch-xp
    },
    to: {
      type: Number,
      es_indexed: true, // mongoose-elasticsearch-xp
    },
    currency: {
      type: String,
      es_indexed: true, // mongoose-elasticsearch-xp
      es_type: 'keyword',  // mongoose-elasticsearch-xp
    },
  },
  {
    _id: false,
  }
);

// Main collection mongoose schema
export const JobSchema = new Schema(
  {
    position: {
      type: String,
      description: 'Person main position in resume, eg. "Sales manager"',
      es_indexed: true, // <------ see `graphql-elasticsearch-xp` for details
      es_boost: 3, // <------ see `graphql-elasticsearch-xp` for details
    },

    salary: {
      type: SalaryRangeSchema,
      description: 'Salary with currency symbol',
      es_indexed: true, // <------ see `graphql-elasticsearch-xp` for details
    },

    employment: {
      type: [
        {
          type: String,
          enum: Object.keys(employmentTypeMap),
        },
      ],
      description: 'List of desired employment types',
      index: true,
      es_indexed: true, // <------ see `graphql-elasticsearch-xp` for details
      es_type: 'keyword', // <------ see `graphql-elasticsearch-xp` for details
    },

    visibility: {
      type: String,
      enum: ['published', 'hidden', 'archived'],
      description: 'job visibility options',
      default: 'published',
    },

    onlyMongooseData: String,
  },
  {
    timestamps: true,
    es_extend: { // <------ see `graphql-elasticsearch-xp` for details
      createdAt: { // pass timestamps to elasticsearch mapping
        es_type: 'date',
        es_value: doc => doc.createdAt, // custom value generation
      },
      updatedAt: {
        es_type: 'date',
        es_value: doc => doc.updatedAt,
      },
      id_keyword: { // pass id as ES keyword
        es_type: 'keyword',
        es_value: doc => (doc._id ? doc._id.toString() : ''), // custom value generation
      },
    },
  }
);
```

### 1.2 Plug `mongoose-elasticsearch-xp` to your Mongoose Schema with data filtering [SYNC MONGO & ES DATA]

```js
/* elastic */
JobSchema.plugin(mongooseElasticsearch, {
  client: elasticClient, // <------ see `graphql-elasticsearch-xp` for details
  filter: doc => {
    if (doc.visibility !== 'published') {
      // add to index new record with visibility='published'
      // or remove existed record from index if `visibility` changed and not 'published' anymore
      return false;
    }
    return true;
  },
});
```

By default  `mongoose-elasticsearch-xp` will track add/remove operations and update your data in elasticsearch. In this case I provide `filter` option, now it will track more clever model's inserts/updates and send proper changes to your elasticsearch server.

Already existed data can be synced via [esSynchronize](https://github.com/jbdemonte/mongoose-elasticsearch-xp#indexing-an-existing-collection) method.

### 1.3 Connection with elasticsearch server `elasticClient`  [ES CLIENT]

You should provide `elasticClient` in step 1.2 (for mongoose plugin [UPDATING DATA]) and 1.4 (for graphql resolvers [SEARCH]). It holds connection of your nodejs server with elasticsearch server.

```js
import elasticsearch from 'elasticsearch';

const elasticClient = new elasticsearch.Client({
  host: ELASTIC_HOST,
  connectionClass: awsElasticConnection, // <---- see elasticsearch js client docs
  amazonES: {
    region: /([^.]+).es.amazonaws.com/.exec(ELASTIC_HOST)[1],
    accessKey: AWS_ACCESS_KEY,
    secretKey: AWS_SECRET_KEY,
  },
  apiVersion: '5.0',
  // log: (typeof __DEV__ === 'boolean' && __DEV__) ? 'trace' : 'error',
});

export default elasticClient;
```

### 1.4 Generate ObjectTypeComposer from elastic mapping [ELASTICSEARCH GRAPHQL TYPES + RESOLVERS]

```js
import { composeWithElastic } from 'graphql-compose-elasticsearch';
import { generate } from 'mongoose-elasticsearch-xp/lib/mapping';

export const JobEsTC = composeWithElastic({
  graphqlTypeName: 'JobES',
  elasticIndex: 'job',
  elasticType: 'job',
  elasticMapping: {
    properties: generate(JobSchema),
  },
  elasticClient,
  // elastic mapping does not contain information about is fields are arrays or not
  // so provide this information explicitly for obtaining correct types in GraphQL
  pluralFields: ['employment'],
});
```

See [https://github.com/nodkz/graphql-compose-elasticsearch#objecttypecomposer-from-elastic-mapping](https://github.com/nodkz/graphql-compose-elasticsearch#objecttypecomposer-from-elastic-mapping)

### 1.5 Generate ObjectTypeComposer from mongoose model [MONGOOSE GRAPHQL TYPES + RESOLVERS]

```js
import composeWithMongoose from 'graphql-compose-mongoose';

export const Job = mongoose.model('Job', JobSchema);
export const JobTC = composeWithMongoose(Job);
```

See [graphql-compose-mongoose](https://github.com/nodkz/graphql-compose-mongoose)

### 1.6 Relating Mongoose and ElasticSearch via GraphQL

Let connect put to `search.hits` a `fromMongo` field which will retrieve data from mongodb for founded elasticsearch record.

```js
JobEsTC.getResolver('search').getTypeComposer().getFieldTC('hits').addRelation('fromMongo', {
  resolver: () => JobTC.getResolver('findById'),
  prepareArgs: {
    _id: source => source._id,
  },
  projection: { _id: true },
});
```

Now you may do such queries:

```graphql
fragment on Query {
  jobEsConnection(first: $first, query: $query, sort: $sort, aggs: $aggs) {
    count
    aggregations
    pageInfo {
      hasNextPage
      hasPreviousPage
    }
    edges {
      cursor
      node {
        _score # meta-data from ES
        _id       # meta-data from ES

        _source {
          employment # record data from ES
          position        # record data from ES
        }

        fromMongo { # data from Mongo
          _id
          onlyMongooseData
          visibility
          salary { from to currency}
          position
        }
      }
    }
  }
}
```

See [https://github.com/nodkz/graphql-compose](https://github.com/nodkz/graphql-compose)
Sorry bad docs in `graphql-compose`. Really do not have time to write it. So try to see issues they contain a lot of info.

### 1.7 Add needed resolvers to schema [BUILD GRAPHQL SCHEMA]

```js
import { GQC } from 'graphql-compose';

GQC.rootQuery().addFields({
  jobEsConnection: JobEsTC.getResolver('search'),
  jobMongoConnection: JobTC.getResolver('connection'),
  jobMany: JobTC.getResolver('findMany'),
  job: JobTC.getResolver('findOnly'),
  jobById: JobTC.getResolver('findById'),
});

const schema = GQC.buildSchema();

export default schema;
```

## 2. Some utility things

Reindexing you may also add to graphql.

### 2.1 Expose Elastic API to graphql schema

```js
import { GQC } from 'graphql-compose';
import { elasticApiFieldConfig } from 'graphql-compose-elasticsearch';
import elasticClient from 'schema/elasticClient';

export const ElasticTC = GQC.get('ELASTIC');

ElasticTC.addResolver({
  name: 'onlyForAdmins',
  type: ElasticTC,
  resolve: ({ context }) => {
    if (!isAdmin({ context })) { // <--- somehow check that you are admin
      throw new Error('You should be admin, to have access to this area.');
    }
    return {};
  },
});

# expose all elastic api via graphql
ElasticTC.addFields({
  api: elasticApiFieldConfig(elasticClient),
});

// DONT FORGET TO add elastic to your schema (eg. to ROOT query)
GQC.rootQuery().addFields({
  elastic: ElasticTC.getResolver('onlyForAdmins'),
});
```

### 2.2 Add reindex helper method to graphql schema

```js
import { generate } from 'mongoose-elasticsearch-xp/lib/mapping';
import { JobSchema, Job } from 'schema/job';

ElasticTC.addFields({
  reindexJob: {
    type: 'JSON',
    resolve: async () => {
      const result = {};

      result.indexExist = await elasticClient.indices.exists({ index: 'job' });
      if (result.indexExist) {
        result.indexDelete = await elasticClient.indices.delete({ index: 'job' });
      }

      result.indexSettings = {
        settings: {
          analysis: {
            filter: {
              english_stop: {
                type: 'stop',
                stopwords: '_english_',
              },
              english_stemmer: {
                type: 'stemmer',
                language: 'english',
              },
              english_possessive_stemmer: {
                type: 'stemmer',
                language: 'possessive_english',
              },
              spanish_stop: {
                type: 'stop',
                stopwords: '_spanish_',
              },
              spanish_stemmer: {
                type: 'stemmer',
                language: 'spanish',
              },
            },
            analyzer: {
              default: {
                tokenizer: 'standard',
                filter: [
                  'lowercase',
                  'spanish_stop',
                  'spanish_stemmer',
                  'english_possessive_stemmer',
                  'english_stop',
                  'english_stemmer',
                ],
              },
            },
          },
        },
        mappings: {
          job: {
            properties: generate(JobSchema),
          },
        },
      };

      result.indexCreate = await elasticClient.indices.create({
        index: 'job',
        body: result.indexSettings,
      });

      Job.on('es-bulk-error', err => {
        if (!result.esSynchronizeErrors) result.esSynchronizeErrors = [];
        result.esSynchronizeErrors.push(err);
      });
      result.esSynchronize = await Job.esSynchronize({
        visibility: { $nin: ['hidden', 'archived'] },
      });
      if (result.esSynchronizeErrors) {
        result.esSynchronizeErrorsCount = result.esSynchronizeErrors.length;
      }

      result.count = await elasticClient.count({ index: 'job', type: 'job' });

      return result;
    },
  },
});
```

Now you may call reindexing all your data in elasticsearch via following graphql query:

```graphql
query {
  elastic {
    reindexJob
  }
}
```
