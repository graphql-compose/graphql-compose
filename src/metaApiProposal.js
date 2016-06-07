import { Schema } from 'mongoose';
const UserMongooseModel = new Schema({
  myName: String,
  surname: String,
  stats: String,
  password: String,
  dob: String,
});

import { composeType, composeField, composeResolve } from 'graphql-compose';
import { description, only, remove, restrict, add } from 'graphql-compose/type';
import { composeTypeFromMongoose } from 'graphql-compose-mongoose';
import { GraphQLString } from 'graphql';



//---------- TYPE MODIFICATORS

composeType('User',
  composeTypeFromMongoose(UserMongooseModel),
  description('User model description'),
  only(['myName', 'surname']), // get only described fields
  remove(['stats', 'password']), // ... or leave others, and remove just listed here
  rename({
    myName: 'name',
    surname: 'lastname',
  }),
  restrict({
    hasAccess: (source, args, context, info) => {
      return context.isAdmin;
    },
    fields: ['name', 'dob'],
  }),
  restrict({
    hasAccess: (source, args, context, info) => {
      return context.isOwner;
    },
    fields: ['stats'],
  }),
  add('time',
    {
      type: GraphQLString,
      resolve: (source, args, context, info) => {
        return JSON.stringify(Date.now());
      },
    }
  ),

  // custom type-middleware
  next => typeConfig => {
    const gqType = next(typeConfig);
    return gqType;
  },
);



//---------- RESOLVERS

composeType('User',
  add(
    'friends',
    composeField(
      // custom field middleware
      next => fieldConfig => {
        const gqField = next(fieldConfig);
        return gqField;
      },
      description('List of friends'),
      argAdd('gender', {}),
      composeResolve(
        argEval(({ source }) => ({ frendId: source._id })),
        resolveList('User'),

        // custom resolve-middleware
        next => resolveParams => {
          return next(resolveParams).then(payload => payload.map( someFn ));
        }
      ),
    ),
  ),


  // BEGIN under mind storm
  changeValue({
    name: (source, args, context, info) => `${source.name} modified`,
  }),
  queryById({
    resolve: () => {}
  }),
  queryList({
    args: { ids, limit, skip, filter, sort },
    resolve: () => {},
  }),
  queryConnection({
    args: { after, first, before, last, filter, sort},
    resolve: () => {},
  }),
  queryById( // another way
    new DataLoader(keys => myBatchGetUsers(keys))
  )
  // END under mind storm
);



//---------- INHERITANCE

composeType('SuperUser',
  cloneType('User'),
  add('isSuperUserType',
    {
      type: GraphQLBoolean,
      resolve: () => true,
    }
  )
);



//---------- MUTATIONS

// BEGIN under mind storm
composeType('UserInput',
  cloneType('User'),
  makeInputType(),
  remove(['id'])
);

composeType('RootMutation',
  add('createUser', composeType('User').queryById)
);
// END under mind storm


//----------- ROOT CONSTRUCTOR

// BEGIN under mind storm
composeType('RootQuery',
  add('user', composeType('User').queryById),
  add('userList', composeType('User').queryList),
  add('userConnection', composeType('User').queryConnection),
  add('superUser', composeType('SuperUser').queryById)
);
// END under mind storm