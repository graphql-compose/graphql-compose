import { SchemaComposer } from '../index';
import { TypeComposer } from '../TypeComposer';

// Changes a driven by the quest for better typing and a better Intelisense experience
// hence boosting productivity
// The following passed tsCheck

interface DeepOptions {
  deep1: string;
  deep2: number;
}

interface Person {
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
    age: 'Int'
  }
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
PersonTC.getResolver<any>('findOne').wrapResolve(next => rp => {
  rp.source.name = 5; // source any
  rp.source.age = 'string';

  return next(rp);
});

// TResolverSource is Person or you may specify
PersonTC.getResolver('findOne').wrapResolve(next => rp => {
  // rp.source.name = 5;  // source Person
  // rp.source.age = 'string';

  // source Person | undefined  as a result of Partial<ResolveParams...
  if (rp.source) {
    rp.source.name = 'string';
    rp.source.age = 5;
  }

  return next(rp);
});

// TC.addResolver()
// add resolver with no type passed in
PersonTC.addResolver<any>({
  resolve: ({ source, context }) => {
    // check availability
    if (source && context) {
      source.age = 2;
      source.name = 'XYZ';
      if (context.uid !== source.uid) {
        // do something if not the current user ...
      }
    }
  }
});

// add resolver with a source type
PersonTC.addResolver<Person>({
  resolve: ({ source, context }) => {
    // check availability
    if (source && context) {
      source.age = 2;
      source.name = 'XYZ';
      if (context.uid !== source.uid) {
        // do something if not the current user ...
      }
    }
  }
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
PersonTC.getFieldTC<DeepOptions>('deep')
  .getResolver('findOne')
  .wrapResolve(next => rp => {
    // check source and context because they are defined as Partial<ResolveParams...
    if (rp.source && rp.context) {
      rp.source.deep1 = 'string';
      rp.context.uid = 'string'; // passes
    }
  });

PersonTC.getFieldTC<any>('deep')
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

// addFields
interface PersonExtended extends Person {
  new1: string;
  new2: number;
  extends: string; // Person
}

// If you want to use the extended person source types then you need a variable to collect
const PersonExtendedTC = PersonTC.addFields<PersonExtended>({
  new1: 'String',
  new2: 'Int'
});

PersonExtendedTC.getResolver('findOne').wrapResolve(next => rp => {
  if (rp.source && rp.context) {
    rp.source.new1 = 'string';
    rp.context.uid = 'string'; // passes
  }
});

PersonExtendedTC.getResolver<any>('findOne').wrapResolve(next => rp => {
  rp.source.new1 = 5;
});

// **************************
// Relations
//
// This particular case has been a bit of a problem, that is before i did the changes
// resolver was always conflicting with the invoking TC
// **************************
PersonExtendedTC.addRelation<Person>('extends', {
  resolver: PersonTC.getResolver('findById'), // comes from other (resolve to)
  prepareArgs: {
    _id: source => source.extends  // type checks well now
  },
  projection: { extends: true }
});

PersonExtendedTC.addRelation('extends', {
  resolver: PersonTC.getResolver('findById'), // comes from other (resolve to)
  prepareArgs: {
    _id: source => source.extends  // type checks well now
  },
  projection: { extends: true }
});
