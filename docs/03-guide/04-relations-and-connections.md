##04 - Relations and connections
Before we start, lets setup 2 schemas..

`People.js`
```js
import mongoose from 'mongoose'
import composeWithMongoose from 'graphql-compose-mongoose'

var PeopleSchema = new mongoose.Schema({
  firstName: { type: String },
  lastName: { type: String },
  email: { type: String },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Companys'
  }
})
export const People = mongoose.model('People', PeopleSchema)
export const PeopleTC = composeWithMongoose(People)
```

`Companies.js`
```js
import mongoose from 'mongoose'
import composeWithMongoose from 'graphql-compose-mongoose'

var CompanysSchema = new mongoose.Schema({
  name: { type: String },
  description: { type: String },
  employeeIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'People'
  }],
})
export const Companies = mongoose.model('Companies', CompanysSchema)
export const CompaniesTC = composeWithMongoose(Companies)
```

###Adding a single relation
Lets start of building a connection from the people to theyr jobs.
This should be added into the `People.js` after the `export const PeopleTC....`
```js
PeopleTC.addRelation(
  'job',
  () => ({
    resolver: CompaniesTC.getResolver('findById'),
    args: {
      _id: source => source.jobId
    },
    projection: { jobId: false },
  })
)
```
Remember to add projection as we need to get the `jobId` in order to find the company in the database.


###Adding a multiple relation
Now we should get those companies some employees. They need to make money..
This should then be added into the `Companies.js`
```js
CompaniesTC.addRelation(
  'employees',
  () => ({
    resolver: PeopleTC.getResolver('findMany'),
    args: {
      filter: source => ({
        _operators:{
          _id:{
            in: source.employeeIds || []
          }
        }
      }),
    },
    projection: { employeeIds: true },
  })
)
```
Remember to add projection as we need to get the `employeeIds` in order to find the company in the database.


###Adding a connection
More to come


### Filters
By default all relations will have added a default filtering options. `filter`, `limit` and `sort`. if you want to disable these you can just set them to `null`
```js
PeopleTC.addRelation(
  'job',
  () => ({
    resolver: CompaniesTC.getResolver('findById'),
    args: {
      _id: source => source.jobId,
      limit: null,
      sort: null,
    },
    projection: { jobId: false },
  })
)
```



### Projection
Example if you want to explicit hide fields that are in the database and not set as hidden. you can use `projection: {}` 
```js
ViewerTC.addRelation(
  'userSearch',
  () => ({
    resolver: UsersTC.getResolver('findMany'),
    args: {
      filter: source => ({ email: source.email })
    },
    projection: {
        address: false,
        city: false, 
    },
  })
)
```


###Relation functions
```js
addRelation(
    fieldName: string, 
    relationFn: () => ({
        resolver: Resolver,
        args?: RelationArgsMapper,
        projection?: ProjectionType,
        description?: string,
        deprecationReason?: string,
    })
): TypeComposer

addRelationRaw(
    fieldName: string,
    resolver: Resolver,
    opts: {
        args?: RelationArgsMapper,
        projection?: { [fieldName: string]: boolean },
        description?: string,
        deprecationReason?: string,
    }
): TypeComposer

getRelations(): RelationThunkMap
buildRelations(): void
buildRelation(fieldName: string): void
```