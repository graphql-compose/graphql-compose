## 02 - Generate TypeComposers

First we need to create our TypeComposer.
The TypeComposer is a builder for GraphQLObjectType object.
Other than having all the standards of a GraphQLObjectType it has all the functions you need to manipulate when you need.

#### Creating TypeComposer from scratch
```js
import { TypeComposer } from 'graphql-compose';

// creating type User with 4 fields
export const UserTC = TypeComposer.create(`
  type User {
    name: String
    nickname: String
    views: Int
    # Field with any type of data
    someJsonMess: Json
  }
`);

// adding fifth field `tweets` with fetching from some remote API
UserTC.addField('tweets', {
  type: 'type TweetList { msg: String, createdAt: Date }',
  resolve: (source, args, context, info) =>
    fetch(`[api_endpoint]/${source.nickname}`).then(res => res.json()),
});

// Add resolveк - helper for fetching data
UserTC.addResolver({
  name: 'findById',
  args: { id: 'Int' },
  type: UserTC,
  resolve: async ({ source, args }) => {
    const res = await fetch(`/endpoint/${args.id}`); // or some fetch from any database
    const data = await res.json();
    // here you may clean up `data` response from API or Database,
    // it should has same shape like UserTC fields
    // eg. { name: 'Peter', nickname: 'peet', views: 20, someJsonMess: { ... } }
    // if some fields are undefined or missing, graphql return `null` on that fields
    return data;
  },
});

// If you need you may get generated GraphQLObjectType via UserTC.getType();
```

#### Converting a Mongoose model to TypeComposer (wrapped GraphQLObjectType) with `graphql-compose-mongoose`.
You may create TypeComposer from mongoose model with bunch of useful resolvers `findById`, `findMany`, `updateOne`, `removeMany` and so on. Read more about [graphql-compose-mongoose](https://github.com/nodkz/graphql-compose-mongoose)

```js
import mongoose from 'mongoose';
import composeWithMongoose from 'graphql-compose-mongoose';

const PersonSchema = new mongoose.Schema({
  firstName: { type: String },
  lastName: { type: String },
  email: { type: String },
});
export const Person = mongoose.model('Person', PersonSchema);

// here composeWithMongoose will create type with fields from mongoose schema
export const PersonTC = composeWithMongoose(Person);

// If you need you may get generated GraphQLObjectType via PersonTC.getType();
```
