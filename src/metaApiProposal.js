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
     addResolverParam('model', UserMongooseModel), // internally added by `composeTypeFromMongoose`
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
    name: ({ source, args, context, info }) => `${source.name} modified`,
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
      addArg('gender', {}),
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



//---------- TYPE/OBJECT DEFAULT LOADERS
// aggggr we get a MONSTER here,
// but it should be hidden by plugin eg. graphql-compose-mongoose
// and don't worry this is not latest version

composeLoader(
  'User',
  'many', // 'one', 'many', 'connection', 'byId', ... may be some other named loaders
  addIdArg, // id!
  addConnectionArgs, // after, first, before, last
  addListArgs, // limit, skip
  addFilterArg('age', {
    type: GraphQLInt,
    query: (query, args) => {
      query.age = args.age || 18;
      return query;
    },
  }),
  addFilterArg('nameStartWith', {
    type: GraphQLString,
    query: (query, args) => {
      query.name = new RegExp('^' + escapeRegExp(args.name)); // mongoose regexp search
      return query;
    },
  }),
  addSortArg('AGE__ASC', (sort) => { sort.age = 1; return sort; } ),
  addSortArg('AGE__DESC', (sort) => { sort.age = -1; return sort; } ),
  addSortArg('AGE_NAME__DESC', (sort) => { sort = { age: -1, name: -1 }; return sort; } ),
  addResolve(
    (pluginParams, loaderParams, { source, args, context, info }) => {
      let cursor = pluginParams.model.find();
      cursor = loaderParams.getFilter(cursor, args);
      cursor = loaderParams.getSort(cursor, args);
      cursor = cursor.select(loaderParams.projection(info));
      return cursor.exec();
    }
  ),
  addResolve( ...chainedResolverIfNeeded),
);

composeLoader(
  'User',
  'byId',
  addIdArg,
  addResolverParam('DL', new DataLoader(keys => myBatchGetUsers(keys))),
  addResolve(
    (pluginParams, loaderParams, { source, args, context, info }) => {
      return loaderParams.DL.load(args.id);
    }
  ),
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
