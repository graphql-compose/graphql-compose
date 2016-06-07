
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
  only(['myName', 'surname']),
  rename({
    myName: 'name',
    surname: 'lastname',
  }),
  remove(['stats', 'password']),
  restrict({
    hasAccess: (source, args, context, info) => {
      return context.isAdmin;
    },
    fields: ['name', 'dob'],
  }),
  add({
    time: {
      type: GraphQLString,
      resolve: (source, args, context, info) => {
        return JSON.stringify(Date.now());
      },
    },
    friends: () => listOf(getComposeType('User')),
  })
);

// somewere else in code extend `User` type
composeType('User',
  changeValue({
    name: (source, args, context, info) => `${source.name} modified`,
  }),
  resolveById({
    resolve: () => {}
  }),
  resolveList({
    args: { ids, limit, skip, filter, sort },
    resolve: () => {},
  }),
  resolveConnection({
    args: { after, first, before, last, filter, sort},
    resolve: () => {},
  }),
  resolveById( // another way
    new DataLoader(keys => myBatchGetUsers(keys))
  )
);

composeType('SuperUser', 
  cloneType('User'),
  add({
    isSuperUserType: {
      type: GraphQLBoolean,
      resolve: () => true,
    }
  })
);

composeType('RootQuery',
  add('user', composeType('User').resolveById),
  add('userList', composeType('User').resolveList),
  add('userConnection', composeType('User').resolveConnection),
  add('superUser', composeType('SuperUser').resolveById)
);

