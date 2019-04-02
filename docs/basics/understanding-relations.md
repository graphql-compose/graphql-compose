---
id: understanding-relations
title: Relations between Types
---

The most important part of GraphQL is a relations between types.

## Relation via FieldConfig

Assume you have `Author` and `Post` types.

```js
import { schemaComposer } from 'graphql-compose';

const AuthorTC = schemaComposer.createObjectTC({
  name: 'Author',
  fields: {
    id: 'Int!',
    firstName: 'String',
    lastName: 'String',
  },
});

const PostTC = schemaComposer.createObjectTC({
  name: 'Post',
  fields: {
    id: 'Int!',
    title: 'String',
    votes: 'Int',
    authorId: 'Int',
  },
});
```

GraphQL allows to create additional fields in your types which may provide data from other type. For example, you may add field `posts` to the `Author` type and write `resolve` function in such way that this field will return array of posts only for current Author.

It can be done in the following manner:

```js
AuthorTC.addFields({
  posts: {
    type: [PostTC], // array of Posts
    resolve: (author, args, context, info) => {
      return DB.Posts.find({ authorId: author.id });
    },
  },
});
```

It's quite easy. But now lets improve our relation and add new arguments `limit` and `skip`:

```js
AuthorTC.addFields({
  posts: {
    type: [PostTC], // array of Posts
    args: {
      limit: {
        type: 'Int',
        defaultValue: 10,
      },
      skip: 'Int',
    },
    resolve: (author, args, context, info) => {
      return DB.Posts
        .find({ authorId: author.id })
        .limit(args.limit)
        .skip(args.skip || 0);
    },
  },
});
```

And this is also very easy, but what if we want provide `filter` argument which adds ability to filter by creation date, and min number of votes:

```js
AuthorTC.addFields({
  posts: {
    type: [PostTC], // array of Posts
    args: {
      limit: {
        type: 'Int',
        defaultValue: 10,
      },
      skip: 'Int',
      filter: `
        input PostsFilterInput {
          createdAtMin: Date
          votesMin: Int
        }
      `,
    },
    resolve: (source, args, context, info) => {
      const criteria = { authorId: source.id };
      if (args.filter) {
        if (args.filter.createdAtMin) criteria.createdAt = { $gt: args.filter.createdAtMin };
        if (args.filter.votesMin) criteria.votes = { $gt: args.filter.votesMin };
      }
      return DB.Posts
        .find(criteria)
        .limit(args.limit)
        .skip(args.skip || 0);
    },
  },
});
```

Hm, it's became quite long. But what if you have other Types wich have relations with Posts (eg Reviewer, Reader)? I don't think that copy/paste of `resolve` method will be a good idea. Cause in the future you may want to add a new `filter` property and should scan all your code and put additional logic in all `FieldConfigs`. So if you meet with such problem the next section is for you.

## Relation via Resolver

If you need to use the same FieldConfigs in different Types for such cases graphql-compose provides **[Resolver](basics/what-is-resolver.md)** class. You may create a Resolver which will define `type`, `args` and `resolve` and reuse in all places of your Schema where you need it.

Anyway if you put `posts` resolver in separate file, you will meet with another problems

- in `Author` type you will use `criteria = { authorId: source.id }` for resolve method;
- in `Reviewer` - `criteria = { reviewers: { $has: source.id } }` and so on.

For such case better to improve `args.filter` by allowing to set `authorId` and `reviewerId` via arguments:

```js
import { schemaComposer } from 'graphql-compose';

const postsResolver = schemaComposer.createResolver({
  type: [PostTC], // array of Posts
  args: {
    limit: {
      type: 'Int',
      defaultValue: 10,
    },
    skip: 'Int',
    filter: `
      input PostsFilterInput {
        createdAtMin: Date
        votesMin: Int
        authorId: ID
        reviewerId: ID
      }
    `,
  },
  resolve: (source, args, context, info) => {
    const { filter } = args;
    const criteria = {};
    if (filter) {
      if (filter.createdAtMin) criteria.createdAt = { $gt: filter.createdAtMin };
      if (filter.votesMin) criteria.votes = { $gt: filter.votesMin };
      if (filter.authorId) criteria.authorId = filter.authorId;
      if (filter.reviewerId) criteria.reviewerId = { $has: filter.reviewerId };
    }
    return DB.Posts
      .find(criteria)
      .limit(args.limit)
      .skip(args.skip || 0);
  },
});
```

And now you may create relations via `ObjectTypeComposer.addRelation` method in such way:

```js
AuthorTC.addRelation('posts', {
  resolver: () => postsResolver,
  prepareArgs: {
    filter: source => ({ authorId: source.id }),
  },
  projection: { id: true },
});

ReviewerTC.addRelation('posts', {
  resolver: () => postsResolver,
  prepareArgs: {
    filter: source => ({ reviewerId: source.id }),
  },
  projection: { id: true },
});
```

## ObjectTypeComposer.addRelation()

`addRelation` method has following arguments:

```js
ObjectTypeComposer.addRelation(
  fieldName: string,
  opts: {
    resolver: () => Resolver,
    prepareArgs?: RelationArgsMapper,
    projection?: ProjectionType,
    description?: string,
    deprecationReason?: string,
  })
): ObjectTypeComposer<any, any>
```

### resolver

Should be an arrow function which returns `Resolver`. Wrapping resolver in arrow function helps to solve `hoisting` problem (when two types imports each other).

### prepareArgs

At runtime we should have ability to prepare somehow args which will be passed to Resolver.

For example our Resolver has following arguments `filter`, `limit`, `skip` and `sort`.
`prepareArgs` provides instruction how to setup them:

- `limit: 10` - hide `limit` arg from schema and set it equal to 10
- `filter: (source) => value` - hide `filter` arg form schema and at runtime evaluate its value
- `sort: null` - disable argument (hide from schema and do not pass it to resolver)
- all undescribed args (like `skip`) will be avaliable in the schema and will be avaliable in query

### projection

Is very useful option for extending requested fields in your query. It very good practice to request from database only that fields which were requested in the query. But sometimes we need to request additional fields for fullfilling `findById` resolver with `authorId` value in arguments. For this purpose you need to use `projection`.

```js
PostTC.addRelation('author', {
  resolver: () => AuthorTC.getResolver('findById'),
  prepareArgs: {
    id: (source) => source.authorId,
  },
  projection: { authorId: true },
});
```

So when you make such query

```js
{
  post {
    author {
      firstName
    }
  }
}
```

it will be transformed to

```js
{
  post {
    author {
      firstName
    }
    authorId # <--- added by `projection` option
  }
}
```

Without `projection` when we will request `author` field its resolver may get `args.authorId` equals to `undefined`. In this situation will not provide any data for `Author`. It happens if fetching only that fields which listed in the query from database. So when client requests `author` field in GraphQL Query he also must request `authorId` explicitly. But why client should care it? So required additional fields should be requested via `projection` option.
