import { Schema } from 'mongoose';
const UserMongooseModel = new Schema({
  myName: String,
  surname: String,
  stats: String,
  password: String,
  dob: String,
  createdAt: Date,
  updatedAt: Date,
});

import { composeType, composeField, composeResolve, composeInterface, composeStorage } from 'graphql-compose';
import { description, only, remove, restrict, add } from 'graphql-compose/type';
import { composeTypeFromMongoose } from 'graphql-compose-mongoose';
import { GraphQLString } from 'graphql';



//---------- TYPE MODIFICATORS

composeType('User',
  composeTypeFromMongoose(UserMongooseModel),
  composeInterface('Timestable'), // internally call composeStorage.Interfaces.get('Timestable')
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
  changeValue({
    name: (source, args, context, info) => `${source.name} modified`,
  }),

  // example of custom type-middleware
  next => typeConfig => {
    const gqType = next(typeConfig);
    return gqType;
  },
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



//---------- FIELD RESOLVERS

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

        // example of custom resolve-middleware
        next => resolveParams => {
          return next(resolveParams).then(payload => payload.map( someFn ));
        }
      ),
    ),
  ),
);



//---------- TYPE/OBJECT DEFAULT FETCHERS (in progress, not ready)

composeTypeFetcher('User',
  byId({
    resolve: () => {}
  }),
  byList({
    args: { ids, limit, skip, filter, sort },
    resolve: () => {},
  }),
  byConnection({
    args: { after, first, before, last, filter, sort},
    resolve: () => {},
  }),
  queryById( // another way
    new DataLoader(keys => myBatchGetUsers(keys))
  )
);



//---------- MUTATIONS (in progress, not ready)

composeType('UserInput',
  cloneType('User'),
  makeInputType(),
  remove(['id'])
);

composeType('RootMutation',
  add('createUser', composeType('User').queryById)
);


//----------- ROOT CONSTRUCTOR  (in progress, not ready)

composeType('RootQuery',
  add('user', composeType('User').queryById),
  add('userList', composeType('User').queryList),
  add('userConnection', composeType('User').queryConnection),
  add('superUser', composeType('SuperUser').queryById)
);



//----------- INTERFACES

composeInterface('Timestable',
  description('Timestable interface for types, which have fields with creation and modification time'),
  add('createdAt', {
    type: GraphQLDate,
  }),
  add('updatedAt', {
    type: GraphQLDate,
  }),
  addTypeResolver( // too bad name, need another
    (value, info) => {
      const type = value._type ? composeStorage.Types.get(value._type) : null;
      if (type) {
        return type;
      }
    }
  ),
  addTypeResolver(otherTypeResolver),
);
