# API reference

Graphql-compose consists from several classes and utilities. Its combination allows to create plugins or helper methods that generate or modify the graphql types.

### TypeComposer
Main class that gets `GraphQLObjectType` (complex **output** type with fields) and provide ability to change them
- get and check presence of fields and interfaces
- add, remove, extend fields
- add relations with other types
- clone type with new name
- manipulate type interfaces
- produce input object type
- keep list of `Resolver`s methods for quering/updating data
- create output types with `GraphQL schema language`

```js
// creating TypeComposer from GraphQLObjectType
const LonLatTC = new TypeComposer(
  new GraphQLObjectType({
    name: 'LonLat',
    fields: {
      lon: {
        type: GraphQLFloat,
      },
      lat: {
        type: GraphQLFloat,
      },
    },
  })
);

// creating TypeComposer via series of methods
const LonLatTC = TypeComposer.create('LonLat'); // create LonLat without fields
LonLatTC.addFields({
  // short field definition
  lon: 'Float', // or may set GraphQLFloat
  // extended field definition
  lat: {
    type: GraphQLFloat, // or may set 'Float'
    resolve: () => {},
    description: 'Latitude',
  }
});

// creating TypeComposer from `GraphQL schema language`
const LonLatTC = TypeComposer.create(`type LonLat { lon: Float, lat: Float }`);

LonLatTC.getFieldNames(); // ['lon', 'lat']
LonLatTC.getField('lon'); // return GraphQLFieldConfig
LonLatTC.getFields(); // { lon: GraphQLFieldConfig, lat: GraphQLFieldConfig }
LonLatTC.setFields(GraphQLFieldMapConfig); // completely replace all fields
LonLatTC.setField('lon', GraphQLFieldConfig); // replace `lon` field with new FieldConfig
LonLatTC.addFields(GraphQLFieldMapConfig); // add new fields, replace existed, rest fields keep untouched
LonLatTC.hasField('lon'); // true
LonLatTC.removeField('lon');
LonLatTC.removeField(['lon', 'field2', 'field3']);
LonLatTC.removeOtherFields(['lon', 'lat']); // will remove all other fields
LonLatTC.reorderFields(['lat', 'lon']); // reorder fields, lat becomes first
LonLatTC.getField('lon'); // undefined
LonLatTC.deprecateFields({ 'lat': 'deprecation reason' }); // mark field as deprecated
LonLatTC.extendField('lat', {
  description: 'Latitude',
  resolve: (source) => (source.lat ? source.lat : 61.1),
});
LonLatTC.getFieldType('lat'); // GraphQLFloat
LonLatTC.getType(); // GraphQLObjectType({ name: 'LonLat', ...})
LonLatTC.getTypePlural(); // new GraphQLList(GraphQLObjectType({ name: 'LonLat', ...}))
LonLatTC.getTypeName(); // LonLat
LonLatTC.setTypeName('LonLatRenamed');
LonLatTC.setDescription('Object type with Longitude and Latitude');
LonLatTC.getDescription(); // 'Object type with Longitude and Latitude'
LonLatTC.clone('newTypeName'); // new TypeComposer with cloned fields and resolvers
LonLatTC.get('dotted.path'); // described below in `typeByPath` section
LonLatTC.getFieldArgs('lat'); // returns map of args config or empty {} if no args
LonLatTC.hasFieldArg('lat', 'arg1'); // false
LonLatTC.getFieldArg('lat', 'arg1'); // returns arg config
LonLatTC.addRelation('facilities', { // add relation with some other TypeComposer
  resolver: () => FacilitiesTC.getResolver('findMany'),
  prepareArgs: {
    filter: (source) => ({ lon: source.lon, lat: source.lat }),
    limit: 100,
  },
  projection: { lon: true, lat: true },
})

// And bunch of other methods (which will be described in future):
// getInterfaces
// setInterfaces
// hasInterface
// addInterface
// removeInterface
//
// getInputType
// getInputTypeComposer
//
// getResolvers
// hasResolver
// getResolver
// setResolver
// addResolver
// removeResolver
//
// setRecordIdFn
// hasRecordIdFn
// getRecordIdFn
// getRecordId
//
// addProjectionMapper
// getProjectionMapper
```

### InputTypeComposer
Class that get `GraphQLInputObjectType` (complex **input** type with fields) and provide ability to change it
- get and check presence of fields
- add, remove fields
- make fields required or optional (wrap/unwrap with `GraphQLNonNull`)
- clone type with new name
- create input types with `GraphQL schema language`

```js
// creating InputTypeComposer from GraphQLInputObjectType
const LonLatITC = new InputTypeComposer(
  new GraphQLInputObjectType({
    name: 'LonLatInput',
    fields: {
      lon: {
        type: new GraphQLNonNull(GraphQLFloat),
      },
      lat: {
        type: new GraphQLNonNull(GraphQLFloat),
      },
    },
  })
);

// creating TypeComposer via series of methods
const LonLatITC = InputTypeComposer.create('LonLatInput'); // create LonLat without fields
LonLatITC.addFields({
  // short field definition
  lon: 'Float!', // or may set new GraphQLNonNull(GraphQLFloat)
  // extended field definition
  lat: {
    type: new GraphQLNonNull(GraphQLFloat), // or may set 'Float!'
    description: 'Latitude',
  }
});

// creating InputTypeComposer from `GraphQL schema language`
const LonLatITC = InputTypeComposer.create(`input LonLatInput { lon: Float!, lat: Float! }`);

LonLatITC.getFieldNames(); // ['lon', 'lat']
LonLatITC.getFields(); // GraphQLInputFieldConfigMap
LonLatITC.hasField('lon'); // true
LonLatITC.setFields(GraphQLInputFieldConfigMap); // completely replace all fields
LonLatITC.setField('lon', GraphQLInputFieldConfig); // replace `lon` field
LonLatITC.addFields(GraphQLInputFieldConfigMap); // add new fields, replace existed, rest fields keep untouched
LonLatITC.getField('lon'); // GraphQLInputFieldConfig
LonLatITC.removeField('lon');
LonLatITC.removeOtherFields(['lon', 'lat']); // will remove all other fields
LonLatITC.extendField('lat', { defaultValue: 51.46, description: 'Prime Meridian' }); // override some field config values
LonLatITC.reorderFields(['lat', 'lon']); // reorder fields, lat becomes first
LonLatITC.getFieldType('lat'); // GraphQLNonNull(GraphQLFloat)
LonLatITC.getType(); // GraphQLInputObjectType({ name: 'LonLatInput', ... })
LonLatITC.getTypeAsRequired(); // GraphQLNonNull(GraphQLInputObjectType(...))
LonLatITC.getTypeName(); // 'LonLatInput'
LonLatITC.setTypeName('LonLatRenamedInput');
LonLatITC.setDescription('Input LonLat type');
LonLatITC.getDescription(); // 'Input LonLat type'
LonLatITC.isRequired('lat'); // true
LonLatITC.makeRequired(['lat']); // wrap field type by GraphQLNonNull (if not wrapped already)
LonLatITC.makeOptional(['lat']); // unwrap from GraphQLNonNull (if not unwrapped already)
LonLatITC.clone('newInputTypeName'); // new InputTypeComposer with cloned fields
LonLatITC.get('dotted.path'); // described below in `typeByPath` section
```

### Resolver
The most interesting class in `graphql-compose`. The main aim of `Resolver` is to keep available resolve methods for Type and use them for building relation with other types.
`Resolver` provide following abilities:
- Add, remove, get, make optional/required arguments
- Clone resolver
- Wrap args, type, resolve (get resolver and create new one with extended/modified functionality)
- Provide helper methods `addFilterArg` and `addSortArg` which wrap resolver by adding argument and resolve logic

In terms of GraphQL Resolver is `GraphQLFieldConfig` with additional functionality and consists from following properties:
- `type` output complex or scalar type (resolver returns data of this type)
- `args` list of field of input or scalar types (resolver accept input arguments for `resolve` method)
- `resolve` method which gather data from data-source
- `description` public description which will be passed to graphql schema and will be available via introspection
- `deprecationReason` if you want to hide field from schema, but leave it working for old clients
- `name` any name for resolver that allow to you identify what it does, eg `findById`, `updateMany`, `removeOne`
- `parent` you may wrap `Resolver` for adding additional checks, modifying result, adding arguments... so this property keeps reference to previous wrapped Resolver
- `kind` type of resolver `query` (resolver just fetch data) or `mutation` (resolver may change data)

```js
const resolver = new Resolver({
  name: 'findById',
  type: LonLatTC, // or GraphQLOutputType
  args: {
    id: 'Int!',
  },
  resolve: ({ source, args, context, info }) => {
    return DB.findById(args.id);
  }
});
// add `findById` resolver to our LonLat type composer for future creation of relations
LonLatTC.addResolver(resolver); // or you may just provide ResolverOpts from above

resolver.hasArg('id'); // true
resolver.getArg('id'): // GraphQLArgumentConfig
resolver.getArgType('id'); // GraphQLInt
resolver.getArgs(); // GraphQLFieldConfigArgumentMap
resolver.getArgNames(); // ['id'], list of arg names
resolver.setArgs(GraphQLFieldConfigArgumentMap); // completely replace all args
resolver.setArg('code', GraphQLArgumentConfig); // set or replace arg
resolver.addArgs(GraphQLFieldConfigArgumentMap); // add new args, replace existed, rest args keep untouched
resolver.cloneArg('filter', 'NewFilterInput'); // clone complex input argument (GraphQLInputObjectType) with new name
resolver.removeArg('code');
resolver.removeOtherArgs(['arg1', 'arg2']); // will remove all other args
resolver.reorderArgs(['arg2', 'arg1']); // reorder args in schema, arg2 becomes first
resolver.isRequired('id'); // true
resolver.makeRequired('id'); // wrap field type by GraphQLNonNull (if not wrapped already)
resolver.makeOptional('id'); // unwrap from GraphQLNonNull (if not unwrapped already)
resolver.getType(); // GraphQLOutputType
resolver.getTypeComposer(); // return TypeComposer with GraphQLOutputType
resolver.setType(GraphQLOutputType | TypeDefinitionString | TypeNameString | TypeComposer)
resolver.getFieldConfig() // { type: ..., args: ..., resolve: ..., description: ...}
resolver.setDescription('Find LatLon by id');
resolver.getDescription(); // 'Find LatLon by id'
resolver.get('dot.path'); // described below in `typeByPath` section
resolver.clone(); // new Resolver instance

// create new wrapped resolver via callback with series of modify methods
resolver.wrap((newResolver, prevResolver) => {
  /* series of modify methods add/get/set/remove */
}); // returns new Resolver

// create new wrapped resolver (wrap only resolve method)
// next = call wrapped resolver
// rp = resolveParams = { source, args, context, info, projection }
resolver.wrapResolve((next) => (rp) => {
  // HERE you may change or check resolveParams
  if (!rp.args.id) return null; // eg interrupt invocation of sub resolve method

  const result = next(rp); // invocate sub resolve method

  // HERE you may change result

  return result;
}); // returns new Resolver
resolver.wrapCloneArg('filter', 'NewFilterInput'); // returns new Resolver with cloned argument type
resolver.addFilterArg(...)  // see https://github.com/nodkz/graphql-compose/issues/22
resolver.addSortArg(...)  // see https://github.com/nodkz/graphql-compose/issues/26

// And other methods:
// wrapArgs
// wrapType
```

### TypeMapper
Type storage and type generator from `GraphQL schema language`. This is slightly rewritten [buildASTSchema](https://github.com/graphql/graphql-js/blob/master/src/utilities/buildASTSchema.js) utility from `graphql-js` that allows to create type from string. Eg
```js
const LonLatGraphQLObjectType = TypeMapperInstance.createType(`
  type LonLat { lon: Float, lat: Float }
`));

const LonLatPointsGraphQLObjectType = TypeMapperInstance.createType(`
  type LonLatPoints { points: [LonLat] }
`));

const IntRangeGraphQLInputObjectType = TypeMapperInstance.createType(`
  input IntRangeInput {
    # Min required value
    min: Int!,
    # Max required value
    max: Int!
  }
`));
```
Or this method can be called directly from graphql-compose main classes:
```js
const LonLatTC = TypeComposer.create(`type LonLat { lon: Float, lat: Float }`);
const LonLatITC = TypeComposer.create(`input LonLatInput { lon: Float!, lat: Float! }`);

// BTW you may create ITC from TC
const LonLatITC2 = LonLatTC.getInputTypeComposer();
LonLatITC2.makeRequired(['lon', 'lat']);
```

### GQC
This is `GraphQLSchema` builder.
- creates `Query` and `Mutation` types
- provide `buildSchema()` method for obtaining `GraphQLSchema`
- remove types without fields

```js
import { GQC } from 'graphql-compose';
import { CityTC } from './city';

GQC.rootQuery().addFields({
  city: CityTC.get('$findOne'),
  cityConnection: CityTC.get('$connection'),
  currentTime: {
    type: 'Date',
    resolve: () => Date.now(),
  },
  // ...
});

GQC.rootMutation().addFields({
  createCity: CityTC.get('$createOne'),
  updateCity: CityTC.get('$updateById'),
  // ...
});

export default GQC.buildSchema(); // exports GraphQLSchema
```

### Utilities
Graphql-compose has several useful methods and GraphQL types.

#### Types
- `Date` - graphql scalar type that converts javascript `Date` object to string `YYYY-MM-DDTHH:MM:SS.SSSZ` and back
- `Json` - graphql scalar type that represents `JSON`. Field with this type may have arbitrary structure. Copied from @taion's [graphql-type-json](https://github.com/taion/graphql-type-json) for reducing dependencies tree.

#### toInputObjectType
Converts `GraphQLObject` type wrapped with `TypeComposer` to `GraphQLInputObjectType` wrapped with `InputTypeComposer`. Can be used in following way:
```js
import { GraphQLObjectType } from 'graphql';
import { toInputObjectType, TypeComposer, InputTypeComposer } from 'graphql-compose';

const GraphQLUserType = new GraphQLObjectType({ ... });
const UserTC = new TypeComposer(GraphQLUserType);
const UserITC = toInputObjectType(UserTC);
const GraphQLUserInput = UserITC.getType(); // returns GraphQLInputObjectType
```

#### projection
Traverse `infoAST` from GraphQL `resolve` function argument and provide `projection`, requested fields in query.
```js
import { getProjectionFromAST } from 'graphql-compose';

function resolve(source, args, context, info) {
  const projection = getProjectionFromAST(info);
  // returns something like
  // {
  //   firstname: true,
  //   lastname: true,
  //   address: {
  //     city: true,
  //     street: true,
  //   },
  // }
}
```

#### typeByPath
Traverse in depth by dot notation by type-tree and returns `TypeComposer`, `InputTypeComposer`, `Resolver` or unwrapped `GraphQLScalarType`.
```js
  typeByPath(UserTC, 'lastname'); // returns GraphQLString
  typeByPath(UserTC, 'address'); // returns TypeComposer(AddressGraphQLType)
  typeByPath(UserTC, 'address.city'); // returns GraphQLString
  typeByPath(UserTC, '$findOne'); // returns Resolver from UserTC which stored by `findOne` name
  typeByPath(UserTC, '$findOne.@filter.firstname'); // get `findOne` resolver, find `filter` arg in resolver, get `firstname` field from it and return it graphql scalar type
```
Or this method can be called directly from graphql-compose main classes:
```js
  TypeComposer.get('fieldName.subField'); // returns TypeComposer | GraphQLScalar
  TypeComposer.get('$resolverName.@argumentName.subFieldName.subSubField'); // returns InputTypeComposer | GraphQLScalar
  InputTypeComposer.get('fieldName.subField'); // returns InputTypeComposer | GraphQLScalar
  Resolver.get('@argumentName'); // returns InputTypeComposer | GraphQLScalar
  Resolver.get('@argumentName.subField'); // returns InputTypeComposer | GraphQLScalar
  Resolver.get('fieldFromPayload'); // returns TypeComposer | GraphQLScalar
  Resolver.get('fieldFromPayload.subField'); // returns TypeComposer | GraphQLScalar
```
