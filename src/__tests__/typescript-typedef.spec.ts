import { SchemaComposer } from '../index';
import { TypeComposer } from '../TypeComposer';

// Changes a driven by the quest for better typing and a better Intelisense experience
// hence boosting productivity
// The following passed tsCheck

interface DeepOptions {
  deep1: string;
  deep2: number;
}

interface GenericUID {
  uid: string;
}

interface Person extends GenericUID {
  uid: string;
  name: string;
  nickName: string;
  age: number;
  deep: DeepOptions;
}

interface Context {
  req: any;
  res: any;
  uid: string;
}

// works for cases where u create your instance of
const schemaComposer = new SchemaComposer<Context>();

// Person from this schemaComposer gets the context defined for that schemaComposer
const PersonTC2 = schemaComposer.getOrCreateTC<Person>('Person');

// create from default schemaComposer uses the context type passed in
// or uses `any` as type
const PersonTC = TypeComposer.create<Person, Context>({
  name: 'Person',
  fields: {
    name: 'String',
    nickName: 'String',
    age: 'Int',
  },
});

// Both PersonTC and PersonTC2 have same TSource and TContext

// ****************************
// Resolvers
//
// overloads works quite well when describing the typedefs separate from implementations ;)
// so we might be having issues with the flow types as it comes with implementation
// If we ditch overloads, then user may need to always specify any if he doesn't want to specify source type
// works for no Type passed and for Person
// ****************************

// TC.getResolver()
// TODO: should be without errors! By default in resolvers source should be `any` even if provided TypeComposer.create<Person, Context>
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
schemaComposer.Query.addFields({
  user: PersonTC.getResolver('findOne').wrapResolve<QuerySource>(next => rp => {
    rp.source.name = 5; // source any
    rp.source.age = 'string'; // <----- here must be an error

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
PersonTC.wrapResolverResolve<any>('findMany', next => rp => {
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

// -------- miss understanding, corrext tests provided below

// // addFields
// interface PersonExtended extends Person {
//   new1: string;
//   new2: number;
//   extends: string; // Person
// }

// // If you want to use the extended person source types then you need a variable to collect
// const PersonExtendedTC = PersonTC.addFields<PersonExtended>({
//   new1: 'String',
//   new2: 'Int'
// });

// PersonExtendedTC.getResolver('findOne').wrapResolve(next => rp => {
//   if (rp.source && rp.context) {
//     rp.source.new1 = 'string';
//     rp.context.uid = 'string'; // passes
//   }
// });

// PersonExtendedTC.getResolver<any>('findOne').wrapResolve(next => rp => {
//   rp.source.new1 = 5;
// });

// adding new field to graphql type, its fieldConfig.resolve method should have TSource type
PersonTC.addFields({
  ageIn2030: {
    type: 'Int',
    resolve: source => {
      // <------------  here `source` MUST have `Person` type
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
interface Art {
  id: number;
  personId: string;
}
const ArtTC = schemaComposer.getOrCreateTC<Art>('Art');

ArtTC.addRelation('extends', {
  // <------------ NO NEED IN addRelation<Person> here
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
