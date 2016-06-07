
import { Schema } from 'mongoose';
const UserMongooseModel = new Schema({
  myName: String,
  surname: String,
  stats: String,
  password: String,
  dob: String,
});


import { addType, only, rename, remove, restrict, add } from 'graphql-compose';
import { composeTypeFromMongoose } from 'graphql-compose-mongoose';
import { GraphQLString } from 'graphql';

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
  add(
    'friends',
    composeField(
      description('List of friends'),
      argAdd('gender', {}),
      composeResolve(
        argEval((source, args, context, info) => ({ frendId: source._id })),
        resolveList('User'),
        next => promise => (source, args, context, info) => {
          return next(promise).then(payload => payload.map( someFn ));
        }
      ),
    ),
  )
);

// somewere else in code extend `User` type
composeType('User',
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
);

composeType('SuperUser',
  cloneType('User'),
  add('isSuperUserType',
    {
      type: GraphQLBoolean,
      resolve: () => true,
    }
  )
);

composeType('RootQuery',
  add('user', composeType('User').queryById),
  add('userList', composeType('User').queryList),
  add('userConnection', composeType('User').queryConnection),
  add('superUser', composeType('SuperUser').queryById)
);

composeType('UserInput',
  cloneType('User'),
  makeInputType(),
  remove(['id'])
);

composeType('RootMutation',
  add('createUser', composeType('User').queryById)
);
