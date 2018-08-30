import { Resolver } from '../../Resolver';
import { Art, Context, Post } from './mock-typedefs';

const findManyPost = new Resolver<Post, Context>({
  resolve: rp => {
    if (rp.source && rp.context) {
      // rp.source.timestamp = 'fails';
      rp.source.timestamp = 4;
      rp.source.author = 'GraphQL superb with Compose';
    }
  },
});

const findOnePostAny = new Resolver({
  resolve: rp => {
    if (rp.source && rp.context) {
      // rp.source.timestamp = 'fails';
      rp.source.timestamp = 'compose';
      rp.source.author = 4;
    }
  },
});

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
