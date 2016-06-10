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
import { fromMongooseComposer } from 'graphql-compose-mongoose';
import { GraphQLString } from 'graphql';


//---------- PLUGIN API

const mcUser = new MongooseComposer(
  UserMongooseModel,
  { opts } // <--- ComposerStorage
);
  setTypeName('User'),
  renameFields({
    myName: 'name',
    surname: 'lastname',
  }),
  removeField(),
  onlyFields(),
  getFields(),
  prop resolvers = { User: { default: ..., byFriendId: ... }}
  getResolver(resolverType = 'User', resolverName = 'default')
  setResolver('User', 'name', resolver);
];

//---------- TYPE MODIFICATORS

composeType('User',
  setDescription(),
  addInterface(),
  addFields(mcUser.getFields()),
  addField('friends', resolver('UserConnection').byFriendId, 'description', 'deprecated'),
  addField('cvConnection', resolver('Cv').connectionByOwnerId, 'description'),
  restrict('fieldName', (resolveParams) => boolean, fallbackValueOrThunk = null),
  restrict(['fieldName', ...], (resolveParams) => boolean, fallbackValueOrThunk = null),
  removeField('friends'),
  /*
  addNativeField('field', GraphQLFieldConfig = {})
  addNativeFields({
    field1: GraphQLFieldConfig,
    field2: GraphQLFieldConfig,
  }),
  */
  getFields(),
);


//---------- RESOLVERS API  (consist from 1) args  2) resolve chain  3) Type )
composeResolver(
  'User', 'byFriendId',

  // ------------ type -------------
  // ??? return type name ???
  // UserList, -> array
  // UserConnection -> connection
  fieldType('User'), // call composeStorage.Types.get('User')

  // ------------ args -------------
  addArgs( {} )
  addArg('gender', {...}),
  removeArg('' | [])
  restrictArg('name', (resolveParams) => boolean, fallbackValueOrThunk = null)
  restrictArg('input.password', (resolveParams) => boolean, fallbackValueOrThunk = null)

  /* // --- move to plugin
  addArgs
    idArg, // id!
    connectionArgs, // after, first, before, last
    listArgs, // limit, skip

  filterArg(
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
  );

  sortArg('AGE__ASC', (query, resloveParams) => { query.sort({ age: 1 }); return query; } ),
  sortArg('AGE__DESC', (query, resloveParams) => { query.sort({ age: -1 }); return query; } ),
  sortArg('AGE_NAME__DESC', (query, resloveParams) => { query.sort({ age: -1, name: -1 }); return query; } ),

  removeSortArg('name'),
  removeFilterArg('name'),

  inputArgs  ...
  */

  // ---------- resolve -----------
  resolve(resloveParams => {
    let cursor = middlewareParams.model.find();
    cursor = middlewareParams.filter.forEach((name, cb) => {
      if (args.input[name]) {
        cursor = cb(cursor, { source, args, context, info });
      }
    });
    cursor = middlewareParams.getSort(cursor, args);
    cursor = cursor.select(loaderParams.projection(info));
    return cursor.exec();
  },

  composeResolve(
    loader('User', 'many', (pluginParams, resolveParams) => { return query; }),
    // example of custom resolve-middleware
    next => resolveParams => {
      return next(resolveParams).then(payload => payload.map( someFn ));
    }
  )
);


//----------- ROOT QUERY CONSTRUCTOR

composeType('RootQuery',
  addField('user',
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
  addField('user', resolver('User')),
  addField('userList', resolver('UserList')),
  addField('userConnection', resolver('UserConnection')),
  addField('superUser', composeLoader('SuperUser', 'someFancy', addIdArg, loader('one'))),
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
