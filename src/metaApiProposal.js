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
  composeFromMongoose(UserMongooseModel),
     setMiddlewareParam('model', UserMongooseModel), // internally added by `composeTypeFromMongoose`
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
  resolveField('name', (payload, { source, args, context, info }) => `${payload.name} modified`),
  composeField('name', {
    composeResolve(
      (next) => (resolveParams) => next(resolveParams).then(payload => `${payload.name} modified`)
    ),
    composePayload(
      (payload, { source, args, context, info }) => `${payload.name} modified`,
    ),
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
      fieldType('User'), // call composeStorage.Types.get('User')
      // custom field middleware
      next => fieldConfig => {
        const gqField = next(fieldConfig);
        return gqField;
      },
      description('List of friends'),
      addArg('gender', {...}),
      composeResolve(
        loader('User', 'many', (pluginParams, resolveParams) => { return query; }),

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
  'many', // 'one', 'many', 'connection', 'byId', 'new', ... may be some other named loaders
  // ??? return type name ???
  setMiddlewareParam('model', UserMongooseModel), /// ---- ???
  addIdArg, // id!
  addConnectionArgs, // after, first, before, last
  addListArgs, // limit, skip
  filterArg('age', GraphQLInt,
    (query, resloveParams) => {
      query.age = args.age;
      return query;
    },
  ),
  filterArg('nameStartWith', GraphQLString,
    (query, { source, args, context, info }) => {
      query.name = new RegExp('^' + escapeRegExp(args.name)); // mongoose regexp search
      return query;
    },
  ),
  sortArg('AGE__ASC', (query, resloveParams) => { query.sort({ age: 1 }); return query; } ),
  sortArg('AGE__DESC', (query, resloveParams) => { query.sort({ age: -1 }); return query; } ),
  sortArg('AGE_NAME__DESC', (query, resloveParams) => { query.sort({ age: -1, name: -1 }); return query; } ),
  beforeResolve((middlewareParams, resloveParams) => resloveParams),
  execResolve(
    (middlewareParams, { source, args, context, info }) => {
      let cursor = middlewareParams.model.find();
      cursor = middlewareParams.filter.forEach((name, cb) => {
        if (args.input[name]) {
          cursor = cb(cursor, { source, args, context, info });
        }
      });
      cursor = middlewareParams.getSort(cursor, args);
      cursor = cursor.select(loaderParams.projection(info));
      return cursor.exec();
    }
  ),
  afterResolve(payloadPromise => payloadPromise),

  // ---- upper loader API
  removeSortArg('name'),
  removeFilterArg('name'),
);

composeLoader(
  'User',
  'byId',
  addIdArg,
  setMiddlewareParam('DL', new DataLoader(keys => myBatchGetUsers(keys))),
  execResolve(
    (middlewareParams, { source, args, context, info }) => {
      return middlewareParams.DL.load(args.id);
    }
  ),
);



//----------- ROOT QUERY CONSTRUCTOR

composeType('RootQuery',
  add('user',
    composeField(
      // fieldType(mongooseLoaderTypeAsString('User', 'one')),
      composeLoader('User', 'one'), // setup arg, Resolve, Type  return arrayOfFieldMW
      description('Fetch user by Id'),
      composeResolve(
        hasAccess((source, args, context, info) => context.isFriend),
      ),
    ),
  ),

  // other simplified way
  add('user', composeLoader('User', 'one')),
  add('userList', composeLoader('User', 'many')),
  add('userConnection', composeLoader('User', 'connection')),
  add('superUser', composeLoader('SuperUser', 'someFancy', addIdArg, loader('one'))),
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



//---------- MUTATIONS

composeMutation('User', 'create',
  description('Create new User'),
  // declare input fields
  addInputsFromType('User'), // deeply convert type `User` to input types
  removeInput('id'), // remove id field from input
  addInput('clientIp', { // also can add fields manually
    type: GraphQLInputType,
    defaultValue: any,
    description: string,
  }),
  // declare output fields
  addOutputId,
  addOutputChanged,
  addOutputChangedEdge,
  addOutputViewer,
  addOutput('someField', {
    type: GraphQLString,
    description: 'Some random value',
    resolve: () =>Math.random(),
  }),
  // declare loaders validators and mutators
  hasAccess((source, args, context, info) => context.canCreateUser),
  loader('new'),
  trimStrings,
  checkIsEmailBusy,
  loader('save'), // too strange, 100% will be changed in future
);

composeType('RootMutation',
  add('createUser', composeMutation('User', 'create'),
);
