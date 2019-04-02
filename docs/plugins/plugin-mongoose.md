---
id: plugin-mongoose
title: graphql-compose-mongoose
sidebar_label: Mongoose plugin
---

This is a plugin for [graphql-compose](https://github.com/graphql-compose/graphql-compose), which derives GraphQLType from your [mongoose model](https://github.com/Automattic/mongoose). Also derives bunch of internal GraphQL Types. Provide all CRUD resolvers, including `graphql connection`, also provided basic search via operators ($lt, $gt and so on).

## Installation

```bash
npm install graphql graphql-compose mongoose graphql-compose-mongoose --save
```

Modules `graphql`, `graphql-compose`, `mongoose` are in `peerDependencies`, so should be installed explicitly in your app. They have global objects and should not have ability to be installed as submodule.

If you want to add additional resolvers [`connection`](https://github.com/graphql-compose/graphql-compose-connection) and/or [`pagination`](https://github.com/graphql-compose/graphql-compose-pagination) - just install following packages and `graphql-compose-mongoose` will add them automatically.

```bash
npm install graphql-compose-connection graphql-compose-pagination --save
```

**Different builds**

This library contains different builds for any purposes:

```js
// Default import for using under node v6 and above
import { composeWithMongoose } from 'graphql-compose-mongoose';

// For using node 8 and above (native async/await)
import { composeWithMongoose } from 'graphql-compose-mongoose/node8';

// Source code without Flowtype declarations
import { composeWithMongoose } from 'graphql-compose-mongoose/es';
```

## Example

Live demo: [https://graphql-compose.herokuapp.com/](https://graphql-compose.herokuapp.com/)

Source code: [https://github.com/graphql-compose/graphql-compose-examples](https://github.com/graphql-compose/graphql-compose-examples)

Small explanation for varaibles naming:

- `UserSchema` - this is a mongoose schema
- `User` - this is a mongoose model
- `UserTC` - this is a `ObjectTypeComposer` instance for User. `ObjectTypeComposer` has `GraphQLObjectType` inside, avaliable via method `UserTC.getType()`.
- Here and in all other places of code variables suffix `...TC` means that this is `ObjectTypeComposer` instance, `...ITC` - `InputTypeComposer`, `...ETC` - `EnumTypeComposer`.

```js
import mongoose from 'mongoose';
import { composeWithMongoose } from 'graphql-compose-mongoose';
import { schemaComposer } from 'graphql-compose';

// STEP 1: DEFINE MONGOOSE SCHEMA AND MODEL
const LanguagesSchema = new mongoose.Schema({
  language: String,
  skill: {
    type: String,
    enum: [ 'basic', 'fluent', 'native' ],
  },
});

const UserSchema = new mongoose.Schema({
  name: String, // standard types
  age: {
    type: Number,
    index: true,
  },
  languages: {
    type: [LanguagesSchema], // you may include other schemas (here included as array of embedded documents)
    default: [],
  },
  contacts: { // another mongoose way for providing embedded documents
    email: String,
    phones: [String], // array of strings
  },
  gender: { // enum field with values
    type: String,
    enum: ['male', 'female', 'ladyboy'],
  },
  someMixed: {
    type: mongoose.Schema.Types.Mixed,
    description: 'Can be any mixed type, that will be treated as JSON GraphQL Scalar Type',
  },
});
const User = mongoose.model('User', UserSchema);



// STEP 2: CONVERT MONGOOSE MODEL TO GraphQL PIECES
const customizationOptions = {}; // left it empty for simplicity, described below
const UserTC = composeWithMongoose(User, customizationOptions);

// STEP 3: Add needed CRUD User operations to the GraphQL Schema
// via graphql-compose it will be much much easier, with less typing
schemaComposer.Query.addFields({
  userById: UserTC.getResolver('findById'),
  userByIds: UserTC.getResolver('findByIds'),
  userOne: UserTC.getResolver('findOne'),
  userMany: UserTC.getResolver('findMany'),
  userCount: UserTC.getResolver('count'),
  userConnection: UserTC.getResolver('connection'),
  userPagination: UserTC.getResolver('pagination'),
});

schemaComposer.Mutation.addFields({
  userCreateOne: UserTC.getResolver('createOne'),
  userCreateMany: UserTC.getResolver('createMany'),
  userUpdateById: UserTC.getResolver('updateById'),
  userUpdateOne: UserTC.getResolver('updateOne'),
  userUpdateMany: UserTC.getResolver('updateMany'),
  userRemoveById: UserTC.getResolver('removeById'),
  userRemoveOne: UserTC.getResolver('removeOne'),
  userRemoveMany: UserTC.getResolver('removeMany'),
});

const graphqlSchema = schemaComposer.buildSchema();
export default graphqlSchema;
```

That's all!
You think that is to much code?
I don't think so, because by default internally was created about 55 graphql types (for input, sorting, filtering). So you will need much much more lines of code to implement all these CRUD operations by hands.

### Working with Mongoose Collection Level Discriminators

Variable Namings

- `...DTC` - Suffix for a `DiscriminatorTypeComposer` instance, which is also an instance of `ObjectTypeComposer`. All fields and Relations manipulations on this instance affects all registered discriminators and the Discriminator Interface.

```js
  import mongoose from 'mongoose';
  import { schemaComposer } from 'graphql-compose';
  import { composeWithMongooseDiscriminators } from 'graphql-compose-mongoose';

  // pick a discriminatorKey
  const DKey = 'type';

  const enumCharacterType = {
    PERSON: 'Person',
    DROID: 'Droid',
  };

  // DEFINE BASE SCHEMA
  const CharacterSchema = new mongoose.Schema({
    // _id: field...
    type: {
      type: String,
      require: true,
      enum: (Object.keys(enumCharacterType): Array<string>),
      description: 'Character type Droid or Person',
    },

    name: String,
    height: Number,
    mass: Number,
    films: [String],
  });

  // DEFINE DISCRIMINATOR SCHEMAS
  const DroidSchema = new mongoose.Schema({
    makeDate: String,
    primaryFunction: [String],
  });

  const PersonSchema = new mongoose.Schema({
    gender: String,
    hairColor: String,
    starships: [String],
  });

  // set discriminator Key
  CharacterSchema.set('discriminatorKey', DKey);

  // create base Model
  const CharacterModel = mongoose.model('Character', CharacterSchema);

  // create mongoose discriminator models
  const DroidModel = CharacterModel.discriminator(enumCharacterType.DROID, DroidSchema);
  const PersonModel = CharacterModel.discriminator(enumCharacterType.PERSON, PersonSchema);

  // create DiscriminatorTypeComposer
  const baseOptions = { // regular TypeConverterOptions, passed to composeWithMongoose
    fields: {
      remove: ['friends'],
    }
  }
  const CharacterDTC = composeWithMongooseDiscriminators(CharacterModel, baseOptions);

  // create Discriminator Types
  const droidTypeConverterOptions = {  // this options will be merged with baseOptions -> customisationsOptions
    fields: {
      remove: ['makeDate'],
    }
  };
  const DroidTC = CharacterDTC.discriminator(DroidModel, droidTypeConverterOptions);
  const PersonTC = CharacterDTC.discriminator(PersonModel);  // baseOptions -> customisationsOptions applied

  // You may now use CharacterDTC to add fields to all Discriminators
  // Use DroidTC, `PersonTC as any other ObjectTypeComposer.
  schemaComposer.Mutation.addFields({
    droidCreate: DroidTC.getResolver('createOne'),
    personCreate: PersonTC.getResolver('createOne'),
  });

  const schema = schemaComposer.buildSchema();

  describe('createOne', () => {
    it('should create child document without specifying DKey', async () => {
      const res = await graphql.graphql(
        schema,
        `mutation CreateCharacters {
          droidCreate(record: {name: "Queue XL", modelNumber: 360 }) {
            record {
              __typename
              type
              name
              modelNumber
            }
          }

          personCreate(record: {name: "mernxl", dob: 57275272}) {
            record {
              __typename
              type
              name
              dob
            }
          }
        }`
      );

      expect(res).toEqual({
        data: {
          droidCreate: {
            record: { __typename: 'Droid', type: 'Droid', name: 'Queue XL', modelNumber: 360 },
          },
          personCreate: {
            record: { __typename: 'Person', type: 'Person', name: 'mernxl', dob: 57275272 },
          },
        },
      });
    });
  });
```

## FAQ

### Can I get generated vanilla GraphQL types?

```js
const UserTC = composeWithMongoose(User);
UserTC.getType(); // returns GraphQLObjectType
UserTC.getInputType(); // returns GraphQLInputObjectType, eg. for args
UserTC.get('languages').getType(); // get GraphQLObjectType for nested field
UserTC.get('fieldWithNesting.subNesting').getType(); // get GraphQL type of deep nested field
```

### How to add custom fields?

```js
UserTC.addFields({
  lonLat: ObjectTypeComposer.create('type LonLat { lon: Float, lat: Float }'),
  notice: 'String', // shorthand definition
  noticeList: { // extended
    type: '[String]', // String, Int, Float, Boolean, ID, Json
    description: 'Array of notices',
    resolve: (source, args, context, info) => 'some value',
  },
  bio: {
    type: GraphQLString,
    description: 'Providing vanilla GraphQL type'
  }
})
```

### How to build nesting/relations?

Suppose you `User` model has `friendsIds` field with array of user ids. So let build some relations:

```js
UserTC.addRelation(
  'friends',
  {
    resolver: () => UserTC.getResolver('findByIds'),
    prepareArgs: { // resolver `findByIds` has `_ids` arg, let provide value to it
      _ids: (source) => source.friendsIds,
    },
    projection: { friendsIds: 1 }, // point fields in source object, which should be fetched from DB
  }
);
UserTC.addRelation(
  'adultFriendsWithSameGender',
  {
    resolver: () => UserTC.get('$findMany'), // shorthand for `UserTC.getResolver('findMany')`
    prepareArgs: { // resolver `findMany` has `filter` arg, we may provide mongoose query to it
      filter: (source) => ({
        _operators : { // Applying criteria on fields which have
                       // operators enabled for them (by default, indexed fields only)
          _id : { in: source.friendsIds },
          age: { gt: 21 }
        },
        gender: source.gender,
      }),
      limit: 10,
    },
    projection: { friendsIds: 1, gender: 1 }, // required fields from source object
  }
);
```

### Reusing the same mongoose Schema in embedded object fields

Suppose you have a common structure you use as embedded object in multiple Schemas.
Also suppose you want the structure to have the same GraphQL type across all parent types.
(For instance, to allow reuse of fragments for this type)
Here are Schemas to demonstrate:

```js
import { Schema } from 'mongoose';

const ImageDataStructure = Schema({
  url: String,
  dimensions : {
    width: Number,
    height: Number
  }
}, { _id: false });

const UserProfile = Schema({
  fullName: String,
  personalImage: ImageDataStructure
});

const Article = Schema({
  title: String,
  heroImage: ImageDataStructure
});
```

If you want the `ImageDataStructure` to use the same GraphQL type in both `Article` and `UserProfile` you will need create it as a mongoose schema (not a standard javascript object) and to explicitly tell `graphql-compose-mongoose` the name you want it to have. Otherwise, without the name, it would generate the name according to the first parent this type was embedded in.

Do the following:

```js
import { schemaComposer } from 'graphql-compose'; // get the default schemaComposer or your created schemaComposer
import { convertSchemaToGraphQL } from 'graphql-compose-mongoose';

convertSchemaToGraphQL(ImageDataStructure, 'EmbeddedImage', schemaComposer); // Force this type on this mongoose schema
```

Before continuing to convert your models to TypeComposers:

```js
import mongoose from 'mongoose';
import { composeWithMongoose } from 'graphql-compose-mongoose';

const UserProfile = mongoose.model('UserProfile', UserProfile);
const Article = mongoose.model('Article', Article);

const UserProfileTC = composeWithMongoose(UserProfile);
const ArticleTC = composeWithMongoose(Article);
```

Then, you can use queries like this:

```graphql
query {
  topUser {
    fullName
    personalImage {
      ...fullImageData
    }
  }
  topArticle {
    title
    heroImage {
      ...fullImageData
    }
  }
}
fragment fullImageData on EmbeddedImage {
  url
  dimensions {
    width height
  }
}
```

### Access and modify mongoose doc before save

This library provides some amount of ready resolvers for fetch and update data which was mentioned above. And you can [create your own resolver](https://github.com/graphql-compose/graphql-compose) of course. However you can find that add some actions or light modifications of mongoose document directly before save at existing resolvers appears more simple than create new resolver. Some of resolvers accepts *before save hook* which can be provided in *resolver params* as param named `beforeRecordMutate`. This hook allows to have access and modify mongoose document before save. The resolvers which supports this hook are:

- createOne
- createMany
- removeById
- removeOne
- updateById
- updateOne

The prototype of before save hook:

```js
(doc: mixed, rp: ExtendedResolveParams) => Promise<*>,
```

The typical implementation may be like this:

```js
// extend resolve params with hook
rp.beforeRecordMutate = async function(doc, rp) {
  doc.userTouchedAt = new Date();

  const canMakeUpdate  = await performAsyncTask( ...provide data from doc... )
  if (!canMakeUpdate) {
    throw new Error('Forbidden!');
  }

  return doc;
}
```

You can provide your implementation directly in type composer:

```js
UserTC.wrapResolverResolve('updateById', next => async rp => {

  // extend resolve params with hook
  rp.beforeRecordMutate = async (doc, resolveParams) => { ... };

  return next(rp);
});
```

or you can create wrappers for example to protect access:

```js
function adminAccess(resolvers) {
  Object.keys(resolvers).forEach((k) => {
    resolvers[k] = resolvers[k].wrapResolve(next => async rp => {

      // extend resolve params with hook
      rp.beforeRecordMutate = async function(doc, rp) { ... }

      return next(rp)
    })
  })
  return resolvers
}

// and wrap the resolvers
schemaComposer.Mutation.addFields({
  createResource: ResourceTC.getResolver('createOne'),
  createResources: ResourceTC.getResolver('createMany'),
  ...adminAccess({
    updateResource: ResourceTC.getResolver('updateById'),
    removeResource: ResourceTC.getResolver('removeById'),
  }),
});
```

## Customization options

When we convert model `const UserTC = composeWithMongoose(User, customizationOptions);` you may tune every piece of future derived types and resolvers.

### Here is flow typed definition of this options:

The top level of customization options. Here you setup name and description for the main type, remove fields or leave only desired fields.

```js
export type typeConverterOpts = {
  name?: string,
  description?: string,
  fields?: {
    only?: string[],
    remove?: string[],
  },
  inputType?: typeConverterInputTypeOpts,
  resolvers?: false | typeConverterResolversOpts,
};
```

This is `opts.inputType` level of options for default InputTypeObject which will be provided to all resolvers for `filter` and `input` args.

```js
export type typeConverterInputTypeOpts = {
  name?: string,
  description?: string,
  fields?: {
    only?: string[],
    remove?: string[],
    required?: string[]
  },
};
```

This is `opts.resolvers` level of options.
If you set the option to `false` it will disable resolver or some of its input args.
Every resolver's arg has it own options. They described below.

```js
export type typeConverterResolversOpts = {
  findById?: false,
  findByIds?: false | {
    limit?: limitHelperArgsOpts | false,
    sort?: sortHelperArgsOpts | false,
  },
  findOne?: false | {
    filter?: filterHelperArgsOpts | false,
    sort?: sortHelperArgsOpts | false,
    skip?: false,
  },
  findMany?: false | {
    filter?: filterHelperArgsOpts | false,
    sort?: sortHelperArgsOpts | false,
    limit?: limitHelperArgsOpts | false,
    skip?: false,
  },
  updateById?: false | {
    record?: recordHelperArgsOpts | false,
  },
  updateOne?: false | {
    record?: recordHelperArgsOpts | false,
    filter?: filterHelperArgsOpts | false,
    sort?: sortHelperArgsOpts | false,
    skip?: false,
  },
  updateMany?: false | {
    record?: recordHelperArgsOpts | false,
    filter?: filterHelperArgsOpts | false,
    sort?: sortHelperArgsOpts | false,
    limit?: limitHelperArgsOpts | false,
    skip?: false,
  },
  removeById?: false,
  removeOne?: false | {
    filter?: filterHelperArgsOpts | false,
    sort?: sortHelperArgsOpts | false,
  },
  removeMany?: false | {
    filter?: filterHelperArgsOpts | false,
  },
  createOne?: false | {
    record?: recordHelperArgsOpts | false,
  },
  createMany?: false | {
    records?: recordHelperArgsOpts | false,
  },
  count?: false | {
    filter?: filterHelperArgsOpts | false,
  },
  connection?: false | {
    uniqueFields: string[],
    sortValue: mixed,
    directionFilter: (<T>(filterArg: T, cursorData: CursorDataType, isBefore: boolean) => T),
  },
  pagination?: false | {
    perPage?: number,
  },
};
```

This is `opts.resolvers.[resolverName].[filter|sort|record|limit]` level of options.
You may tune every resolver's args independently as you wish.
Here you may setup every argument and override some fields from the default input object type, described above in `opts.inputType`.

```js
export type filterHelperArgsOpts = {
  filterTypeName?: string, // type name for `filter`
  isRequired?: boolean, // set `filter` arg as required (wraps in GraphQLNonNull)
  onlyIndexed?: boolean, // leave only that fields, which is indexed in mongodb
  requiredFields?: string | string[], // provide fieldNames, that should be required
  operators?: filterOperatorsOpts | false, // provide filtering fields by operators, eg. $lt, $gt
                                           // if left empty - provides all operators on indexed fields
};

// supported operators names in filter `arg`
export type filterOperatorNames =  'gt' | 'gte' | 'lt' | 'lte' | 'ne' | 'in[]' | 'nin[]';
export type filterOperatorsOpts = { [fieldName: string]: filterOperatorNames[] | false };

export type sortHelperArgsOpts = {
  sortTypeName?: string, // type name for `sort`
};

export type recordHelperArgsOpts = {
  recordTypeName?: string, // type name for `record`
  isRequired?: boolean, // set `record` arg as required (wraps in GraphQLNonNull)
  removeFields?: string[], // provide fieldNames, that should be removed
  requiredFields?: string[], // provide fieldNames, that should be required
};

export type limitHelperArgsOpts = {
  defaultValue?: number, // set your default limit, if it not provided in query (default: 1000)
};
```

## Used plugins

### [graphql-compose-connection](https://github.com/graphql-compose/graphql-compose-connection)

This plugin adds `connection` resolver. Build in mechanism allows sort by any unique indexes (not only by id). Also supported compound sorting (by several fields).

Besides standard connection arguments `first`, `last`, `before` and `after`, also added great arguments:

- `filter` arg - for filtering records
- `sort` arg - for sorting records

This plugin completely follows to [Relay Cursor Connections Specification](https://facebook.github.io/relay/graphql/connections.htm).

### [graphql-compose-pagination](https://github.com/graphql-compose/graphql-compose-pagination)

This plugin adds `pagination` resolver.

## License

[MIT](https://github.com/graphql-compose/graphql-compose-mongoose/blob/master/LICENSE.md)
