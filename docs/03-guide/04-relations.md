## 04 - Relations and connections
Before we start, lets setup 2 schemas..

```js
// People.js
import mongoose from 'mongoose';
import composeWithMongoose from 'graphql-compose-mongoose';

var PeopleSchema = new mongoose.Schema({
  firstName: { type: String },
  lastName: { type: String },
  email: { type: String },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
  }
});

export const People = mongoose.model('People', PeopleSchema);
export const PeopleTC = composeWithMongoose(People);
```

```js
// Company.js
import mongoose from 'mongoose';
import composeWithMongoose from 'graphql-compose-mongoose';

var CompanySchema = new mongoose.Schema({
  name: { type: String },
  description: { type: String },
  employeeIds: [{
    type: mongoose.Schema.Types.ObjectId,
  }],
});
export const Company = mongoose.model('Company', CompanySchema);
export const CompanyTC = composeWithMongoose(Company);
```

### Adding a single relation
Lets start of building a relation from the people to their jobs.

```js
// People.js

// ... after the `export const PeopleTC...`
PeopleTC.addRelation(
  'job',
  {
    resolver: () => CompanyTC.getResolver('findById'),
    prepareArgs: {
      _id: source => source.jobId
    },
    projection: { jobId: true },
  }
);
```
Remember to add projection as we need to get the `jobId` in order to find the company in the database.


### Adding a multiple relation
Now we should get those companies some employees.
```js
// Company.js

// ... after the `export const CompanyTC...`
CompanyTC.addRelation(
  'employees',
  {
    resolver: () => PeopleTC.getResolver('findByIds'),
    prepareArgs: {
      _ids: (source) => source.employeeIds || [],
    },
    projection: { employeeIds: true },
  }
);
```
Remember to add projection as we need to get the `employeeIds` in order to find the company in the database.


### Filters
By default relations may have arguments, eg. `filter`, `limit`, `skip` and `sort`. if you want to disable arguments just set them to `null`. Or you may hide it from schema and set value by default to them (see `_id` and `limit`).
```js
PeopleTC.addRelation(
  'job',
  {
    resolver: () => CompanyTC.getResolver('findById'),
    prepareArgs: {
      _id: source => source.jobId, // calculate _id value
      limit: 10, // set default value
      sort: null, // just remove arg from schema
    },
    projection: { jobId: true },
  }
);
```

### Relation function
```js
addRelation(
    fieldName: string,
    opts: {
        resolver: () => Resolver,
        prepareArgs?: RelationArgsMapper,
        projection?: ProjectionType,
        description?: string,
        deprecationReason?: string,
    })
): TypeComposer
```
