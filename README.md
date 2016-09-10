# GraphQL-compose
[![](https://img.shields.io/npm/v/graphql-compose.svg)](https://www.npmjs.com/package/graphql-compose) 
 [![npm](https://img.shields.io/npm/dt/graphql-compose.svg)](https://www.npmjs.com/package/graphql-compose) 
 [![Join the chat at https://gitter.im/graphql-compose/Lobby](https://badges.gitter.im/nodkz/graphql-compose.svg)](https://gitter.im/graphql-compose/Lobby)
 [![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

`GraphQL-compose` is an instrument which allows you to construct flexible graphql schema from different data sources via plugins. The main aim of `graphql-compose` to solve the problem of mash code in schema's files, and ridiculously simplify schema build process on server.

Compose your GraphQL schema in declarative way: 
- Add/remove needed fields in types
- Create relations between types
- Reduce access to fields, attach custom logic to resolvers and much more
- Use [plugin](https://github.com/nodkz/graphql-compose-mongoose) to convert mongoose models to GraphQL types
- Use [plugin](https://github.com/nodkz/graphql-compose-relay) to make your schema/types compatible with Relay (mutationId, node interface)
- Use [plugin](https://github.com/nodkz/graphql-compose-connection) to create RelayConnectionType with filter and sorting 

##Example
```js
var UserSchema = new mongoose.Schema({...})

const Users = mongoose.model('User', UserSchema)
const UsersTC = composeMongoose(Users) //TypeComposer - used to edit and render your GraphQLObject

const ViewerTC = GQC.get('Viewer')
GQC.rootQuery().addField('viewer', {
  type: ViewerTC.getType(),
  description: 'Data under client context',
  resolve: () => ({}),
})

ViewerTC.addField('user', UsersTC.getResolver('findOne').getFieldConfig() )

export default GQC.buildSchema()

```

## Documentation
You can find out documentation here:
[Current version](https://github.com/nodkz/graphql-compose/tree/master/docs)

##Live Demos
- [graphql-compose.herokuapp.com](https://graphql-compose.herokuapp.com/) - Live demo of GraphQL Server (9 models, 14 files, ~750 LOC)
- [nodkz.github.io/relay-northwind](https://nodkz.github.io/relay-northwind) - Live demo of Relay client working with the server above (8 crazy pages, 47 files, ~3000 LOC)


##To-Do list
- [x] write mongoose schema converter to graphql types with CRUD resolver helpers [graphql-compose-mongoose](https://github.com/nodkz/graphql-compose-mongoose)
- [x] write a Relay types wrapper for adding relay specifics things, like `Node` type and interface, `globalId`, `clientMutationId`() [graphql-compose-relay](https://github.com/nodkz/graphql-compose-relay)
- [x] realize `GraphQL Cursor Connections` wrapper, which extends types dirived via graphql-compose with additional resolvers `connection`. This wrapper implicitly consume `findMany` and `count` resolvers defined in type [graphql-compose-connection](https://github.com/nodkz/graphql-compose-connection)
- [ ] polish `graphq-compose`, add access restrictions to fields, attach custom logic to resolvers, docs and examples
- [ ] write [DataLoader](https://github.com/facebook/dataloader) resolver's wrapper for reducing number of queries
- [ ] add support for PubSub. Introduce subscriptions to your graphql schemas
- [ ] write `graphql-compose-remote-graphql` module, for building your own types which will resolve from 3rd party graphql servers
- [ ] write `graphql-compose-rest` module, for building your own types which will resolve from 3rd party REST api's. It will be prototype for simple and fast realization of your rest wrappers
- [ ] **[need help]** find somebody who write `graphql-compose-sequilze` module like `graphql-compose-mongoose` (need to write types converter, and change resolver functions). Flow type and mocha tests are required!


Level 1: TYPES MODIFICATION: modify your GraphQL Object Types anywhere
==========================================
`graphql-compose` has two awesome manipulators. That can change graphql anywhere and anytime before build schema. It allows to create a bunch of awesome wrappers, plugins and middlewares (level 4).
#### `TypeComposer` for `GraphQLObjectType`
```js
  // Basic methods:
  constructor(gqType: GraphQLObjectType)
  getType(): GraphQLObjectType
  getTypeName(): string
  setTypeName(name: string): void
  getDescription(): string
  setDescription(description: string): void

  // Working with fields:
  getFields(): GraphQLFieldConfigMap
  setFields(fields: GraphQLFieldConfigMap): void
  getFieldNames(): string[]
  hasField(fieldName: string): boolean
  getField(fieldName: string): ?GraphQLFieldConfig
  addField(fieldName: string, fieldConfig: GraphQLFieldConfig)
  addFields(newFields: GraphQLFieldConfigMap): void
  removeField(fieldNameOrArray: string | Array<string>): void
  getFieldType(fieldName: string): GraphQLOutputType | void
  getFieldArgs(fieldName: string): ?GraphQLFieldConfigArgumentMap
  getFieldArg(fieldName: string, argName: string): ?GraphQLArgumentConfig

  // Working with interfaces:
  getInterfaces(): Array<GraphQLInterfaceType>
  setInterfaces(interfaces: Array<GraphQLInterfaceType>): void
  hasInterface(interfaceObj: GraphQLInterfaceType): boolean
  addInterface(interfaceObj: GraphQLInterfaceType): void
  removeInterface(interfaceObj: GraphQLInterfaceType): void

  // New thing: working with automatically converted InputType
  getInputType(): GraphQLInputObjectType
  hasInputTypeComposer()
  getInputTypeComposer()

  // New thing: working with `RESOLVER (level 2)`
  getResolvers(): ResolverList
  hasResolver(name: string): boolean
  getResolver(name: string): Resolver | void
  setResolver(resolver: Resolver): void  
  addResolver(resolver: Resolver): void
  removeResolver(resolver: string|Resolver): void

  // New thing: working with `RELATIONS`
  addRelation(fieldName: string, relationFn: () => ({
    resolver: Resolver,
    args?: RelationArgsMapper,
    projection?: ProjectionType,
    description?: string,
    deprecationReason?: string,
  })): TypeComposer
  addRelationRaw(
    fieldName: string,
    resolver: Resolver,
    opts: {
      args?: RelationArgsMapper,
      projection?: { [fieldName: string]: boolean },
      description?: string,
      deprecationReason?: string,
    }
  ): TypeComposer
  getRelations(): RelationThunkMap
  buildRelations(): void
  buildRelation(fieldName: string): void

  // New thing: obtaining id from `source`
  hasRecordIdFn(): boolean
  getRecordIdFn(): GetRecordIdFn
  getRecordId(source: ?mixed, args: ?mixed, context: ?mixed): string | number

  // New other things
  clone(newTypeName: string): TypeComposer
  getByPath(path: string): TypeComposer | InputTypeComposer | void
```



#### `InputTypeComposer` for `GraphQLInputObjectType`
```js
  // Basic methods:
  constructor(gqType: GraphQLInputObjectType)
  getType(): GraphQLInputObjectType
  getTypeName(): string
  setTypeName(name: string): void
  getDescription(): string
  setDescription(description: string): void

  // Working with fields:
  getFields(): InputObjectConfigFieldMap
  getFieldNames(): string[]
  hasField(fieldName: string): boolean
  setFields(fields: InputObjectConfigFieldMap): void
  addField(fieldName: string, fieldConfig: InputObjectFieldConfig)
  addFields(newFields: InputObjectConfigFieldMap)
  getField(fieldName: string): ?InputObjectField
  removeField(fieldNameOrArray: string | Array<string>)
  getFieldType(fieldName: string): GraphQLInputType | void

  // Helpers for fields
  isFieldRequired(fieldName: string): boolean
  makeFieldsRequired(fieldNameOrArray: string | Array<string>)
  makeFieldsOptional(fieldNameOrArray: string | Array<string>)

  // New other things
  clone(newTypeName: string): InputTypeComposer
  getByPath(path: string): InputTypeComposer | void
```

Level 2: RESOLVERS
==================
`graphql-compose` by design assume that MainTypes has CRUD operations. And they are called `RESOLVERS`, e.g. `findById`, `findByIds`, `findOne`, `findByMany`, `update*`, `remove*`, `createOne`, `count` or any others as you wish. This helps reuse existed resolvers for building complex schema.

RESOLVER consist from:
- `outputType` - type that will be returned after resolving
- `args` - arguments needed for resolving
- `resolve` - standard graphql resolve method

So when you build relations, you may use defined standard resolvers wrapped with your additional business logic, applying middlewares to it.

So when you define field (non-scalar) via `graphql-compose` you will use something like this:
```js
fieldName: {
  description
  middlewares(resolver)
}
```

Level 3: BUILDING SCHEMA (in active development)
========================
- Field Restrictions
- Types Relation
- Applying other business logic to resolvers


##Other
[CHANGELOG](https://github.com/nodkz/graphql-compose/blob/master/CHANGELOG.md)

##License
[MIT](https://github.com/nodkz/graphql-compose/blob/master/LICENSE.md)
