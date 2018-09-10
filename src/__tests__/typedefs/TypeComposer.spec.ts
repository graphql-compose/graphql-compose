import { TypeComposer } from '../../TypeComposer';

// Person from this schemaComposer gets the context defined for that schemaComposer
import {
  Art,
  Context,
  DeepOptions,
  GenericUID,
  Person,
  Post,
  schemaComposerWithContext,
} from './mock-typedefs';

// I understand the schemaComposers are different, here is just for demos

// create from default schemaComposer uses the context type passed in
// TSource Person, TContext Context
const PersonTC = TypeComposer.create<Person, Context>({
  name: 'Person',
  fields: {
    name: 'String',
    nickName: 'String',
    age: 'Int',
  },
});

// TSource Art, TContext Context
const ArtTC = schemaComposerWithContext.getOrCreateTC<Art>('Art');

// TSource any, TContext any
const PostTC = TypeComposer.create('Post');

// ****************************
// Resolvers
//
// overloads works quite well when describing the typedefs separate from implementations ;)
// so we might be having issues with the flow types as it comes with implementation
// If we ditch overloads, then user may need to always specify any if he doesn't want to specify source type
// works for no Type passed and for Person
// ****************************

// TC.getResolver()
// should be without errors! By default in resolvers source should be `any` even if provided TypeComposer.create<Person, Context>
PersonTC.getResolver('findOne').wrapResolve(next => rp => {
  rp.source.name = 5; // source any
  rp.source.age = 'string';

  return next(rp);
});

// BUT I see your what you want to do. So let provide source correctly to `wrapResolve` function:
// We keep standard resolvers untyped forsource. BUT almost all wrappers created for some exact type,
// so let make it typed! I think it's a right place.
interface QuerySource {
  name: number;
  age: number;
}
schemaComposerWithContext.Query.addFields({
  user: PersonTC.getResolver('findOne').wrapResolve<QuerySource>(next => rp => {
    if (rp.source) {
      rp.source.name = 5; // source any
      // rp.source.age = 'string'; // <----- here must be an error
      rp.source.age = 4;
    }

    return next(rp);
  }),
});

// TResolverSource is Person or you may specify
PersonTC.getResolver('findOne').wrapResolve(next => rp => {
  // rp.source.name = 5;  // source Person
  // rp.source.age = 'string';

  // source Person | undefined  as a result of Partial<ResolveParams...
  if (rp.source) {
    rp.source.name = 2; // <---- for backward compatibility for TS users, here should be mo errors (by default source: any)
    rp.source.age = 5;
  }

  return next(rp);
});

// TC.addResolver()
// add resolver with no type passed in
PersonTC.addResolver({
  // <---------------- by default resolver has `source: any` an it can not be defined explicitly like it was
  resolve: ({ source, context }) => {
    // check availability
    if (source && context) {
      source.age = 2;
      source.name = 2; // <---- should not be error
      if (context.uid !== source.uid) {
        // do something if not the current user ...
      }
    }
  },
});

// add resolver with a source type
// <<<------ here I change Person on something basic GenericUID. Let assume that from GenericUID extended all other models, which will use this resolver.
PersonTC.addResolver<GenericUID>({
  // <--- this is ok, if we want to provide really Basic/Global/Generic interface, which will be implemented in several types/models. And then to these types we will add current resolver.
  resolve: ({ source, context }) => {
    // check availability
    if (source && context) {
      if (context.uid !== source.uid) {
        // do something if not the current user ...
      }
    }
  },
});

// wrapResolverResolve
PersonTC.wrapResolverResolve('findMany', next => rp => {
  rp.source.name = 5; // source any
  rp.source.age = 'string';

  return next(rp);
});

PersonTC.wrapResolverResolve<Person>('findMany', next => rp => {
  // rp.source.name = 5;  // source Person
  // rp.source.age = 'string';

  // source Person | undefined  as a result of Partial<ResolveParams...
  if (rp.source) {
    rp.source.name = 'string';
    rp.source.age = 5;
  }

  return next(rp);
});

// ****************************
// Fields
// No Overloads created for fields
// ****************************
PersonTC.getFieldTC('deep') // <----- no matter what type you provide here, it should not affect on rp.source below
  .getResolver('findOne')
  .wrapResolve<DeepOptions>(next => rp => {
    // <----- provide type here, if you want to check rp.source
    // check source and context because they are defined as Partial<ResolveParams...
    if (rp.source && rp.context) {
      rp.source.deep1 = 'string';
      rp.context.uid = 'string'; // passes
    }
  });

PersonTC.getFieldTC('deep') // <-------------- this case should not have errors
  .getResolver('findOne')
  .wrapResolve(next => rp => {
    // no checking of rp.source as it is any, but we check context as it is inherited
    rp.source.deep1 = 5; // passes
    rp.source.deep1 = 'ssas'; // passes

    // not checked errors, rp may be undefined
    // rp.context... // fails

    if (rp.context) {
      // rp.context.uid = 5;   // fails
      rp.context.uid = 'string'; // passes
    }
  });

// adding new field to graphql type, its fieldConfig.resolve method should have TSource type
PersonTC.addFields({
  ageIn2030: {
    // test Thunk
    type: () =>
      TypeComposer.create({
        name: 'deepAge',
        fields: {
          age: {
            type: 'Int',
            // test composeFieldConfig<TSource = Person ...
            resolve: (source, args, context) => {
              source.name = 'string';
              // source.name = 55; <-- errors
            },
          },
        },
      }),
    resolve: (source, args, context) => {
      // if you don't provide other args, typescript resolves source as any
      return source.age + 12;
    },
  },
});

// **************************
// Relations
//
// This particular case has been a bit of a problem, that is before i did the changes
// resolver was always conflicting with the invoking TC
// **************************
ArtTC.addRelation('extends', {
  resolver: PersonTC.getResolver('findById'), // comes from other (resolve to)
  prepareArgs: {
    _id: source => source.personId, // type checks well now
  },
  projection: { personId: true },
});

// <----------- became the same as above, so comment this case.
// ArtTC.addRelation('extends', {
//   resolver: PersonTC.getResolver('findById'), // comes from other (resolve to)
//   prepareArgs: {
//     _id: source => source.extends  // type checks well now
//   },
//   projection: { extends: true }
// });

// with TArgs
interface GeneralArgs {
  filter: { id: string };
  skip: number;
  limit: number;
}

// in resolvers
PersonTC.addResolver<GenericUID, GeneralArgs>({
  // <--- this is ok, if we want to provide really Basic/Global/Generic interface, which will be implemented in several types/models. And then to these types we will add current resolver.
  resolve: ({ source, context, args }) => {
    // check availability
    if (source && context && args) {
      if (context.uid !== source.uid) {
        // args.skip = 'st';
        args.skip = 4;
        // do something if not the current user ...
      }
    }
  },
});

// wrapResolverResolve
PersonTC.wrapResolverResolve('findMany', next => rp => {
  rp.source.name = 5; // source any
  rp.source.age = 'string';

  if (rp.args) {
    rp.args.skip = 'string';
    rp.args.skip = 4;
  }

  return next(rp);
});

PersonTC.wrapResolverResolve<Person, GeneralArgs>('findMany', next => rp => {
  // rp.source.name = 5;  // source Person
  // rp.source.age = 'string';

  // source Person | undefined  as a result of Partial<ResolveParams...
  if (rp.source && rp.args) {
    rp.source.name = 'string';
    rp.source.age = 5;
    // rp.args.skip = 'ss';
    rp.args.skip = 4;
  }

  return next(rp);
});

// in relations
ArtTC.addRelation('extends', {
  resolver: PersonTC.getResolver('findById').wrapResolve(next => rp => {
    if (rp.args) {
      // rp.args.skip = 'hey';
      rp.args.skip = 4;
    }
  }),
  prepareArgs: {
    _id: source => source.personId, // type checks well now
  },
  projection: { personId: true },
});

ArtTC.addRelation<Person, GeneralArgs>('extends', {
  resolver: PersonTC.getResolver('findById').wrapResolve(next => rp => {
    if (rp.args) {
      // rp.args.skip = 'hey';
      rp.args.skip = 4;
    }
  }),
  prepareArgs: {
    _id: source => source.personId, // type checks well now
  },
  projection: { personId: true },
});

ArtTC.addRelation('extends', {
  type: 'Int',
  resolve: (source, args, context) => {
    source.id = 33;
    args.skip = 'string';
    args.skip = 33;
    context.uid = 'string';
  },
});

ArtTC.addRelation<Art, GeneralArgs>('extends', {
  type: 'Int',
  resolve: (source, args, context) => {
    source.id = 33;
    // args.skip = 'string';
    args.skip = 33;
    context.uid = 'string';
  },
});
