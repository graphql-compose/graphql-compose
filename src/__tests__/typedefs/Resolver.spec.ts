import { GraphQLInt, GraphQLString } from 'graphql';
import { Resolver } from '../../Resolver';
import { schemaComposer } from '../..';
import { Args, Art, Context, Post } from './mock-typedefs';

const findManyPost = new Resolver<Post, Context, Args>(
  {
    args: {
      filter: { type: GraphQLString },
      limit: { type: GraphQLInt },
      skip: { type: GraphQLInt },
      sort: { type: GraphQLString },
      // unknown: {type: GraphQLInt}, errors
    },
    resolve: rp => {
      if (rp.source && rp.context) {
        // rp.source.timestamp = 'fails';
        rp.source.timestamp = 4;
        rp.source.author = 'GraphQL superb with Compose';
      }
    },
  },
  schemaComposer,
);

const findOnePostAny = new Resolver(
  {
    resolve: rp => {
      if (rp.source && rp.context) {
        // rp.source.timestamp = 'fails';
        rp.source.timestamp = 'compose';
        rp.source.author = 4;
      }
    },
  },
  schemaComposer,
);

// wrap
const findManyArt = findManyPost.wrap<Art>(
  (newResolver, prevResolver) => {
    newResolver.cloneArg('filter', 'AuthorFilterForUsers');

    newResolver
      .getArgTC('filter')
      .removeField(['age', 'other_sensetive_filter']);

    return newResolver;
  },
  {
    resolve: ({ source, context }) => {
      if (source && context) {
        // source.id = 'string' fails
        source.id = 444;
      }
    },
  },
);

findManyArt.wrapResolve(next => rp => {
  if (rp.source && rp.context) {
    // rp.source.id = 'string' fails
    rp.source.id = 444;
  }
});

findManyPost.wrapResolve(next => rp => {
  if (rp.source && rp.context) {
    // rp.source.title = 555 fails
    rp.source.title = 'A Title';
  }
});

// args intro
interface FindManyArtArgs {
  filter: { id: string; personId: string };
  skip: number;
}

const findManyArt1 = new Resolver<any, any, FindManyArtArgs>(
  {
    resolve: rp => {
      if (rp.args) {
        // rp.args.skip = 'dsd';
        rp.args.skip = 4;
        rp.args.filter.id = 'string';
      }
    },
  },
  schemaComposer,
);

// all any
const findManyPost1 = new Resolver(
  {
    args: {
      skip: { type: GraphQLInt },
    },
    resolve: ({ source, context, args }) => {
      source.title = 555; // pass as source is any fails
      source.title = 'A Title';

      if (args) {
        args.skip = 'hello';
        args.skip = 4;
      }
    },
  },
  schemaComposer,
);

// inherits findManyArtArgs, can be overwritten
findManyArt1.wrapResolve<Art, FindManyArtArgs>(next => rp => {
  if (rp.source && rp.context && rp.args) {
    // rp.source.id = 'string' fails
    rp.source.id = 444;

    // rp.args.skip = 'string';
    rp.args.skip = 4;
  }
});

findManyArt1.wrap(
  (newResolver, prevResolver) => {
    newResolver.cloneArg('filter', 'AuthorFilterForUsers');

    newResolver
      .getArgTC('filter')
      .removeField(['age', 'other_sensetive_filter']);

    return newResolver;
  },
  {
    resolve: ({ source, context, args }) => {
      if (source && context && args) {
        // source.id = 'string' fails
        source.id = 444;
        // args.skip = 'fails';
        args.skip = 3;
      }
    },
  },
);
