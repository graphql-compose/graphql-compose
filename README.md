# Right now just proposal, stay tunned.
See my previous production ready, but unpublished version of mongoose to graphql module: https://github.com/nodkz/graphql-mongoose
By this link, you may find an example of mash-code in my app, which derived from a map-derived-schema adapters/converters.
So I have brilliant thoughts how to simplify it!

🌶🌶🌶 Long live to middlewares and compose!🌶🌶🌶  
I wanted to finish `graphql-compose` module at the End of June, but it takes too much time. So... Welcome July! And... Welcome August, **but I began to implement and test it in our big `project`**.

[Tiny live demo showing mongoose schema convertation](https://graphql-compose-mongoose.herokuapp.com/)

To-Do
=====
- [x] write mongoose schema converter to graphql types with CRUD resolver helpers [graphql-compose-mongoose](https://github.com/nodkz/graphql-compose-mongoose)
- [x] write a Relay types wrapper for adding relay specifics things, like `Node` type and interface, `globalId`, `clientMutationId`() [graphql-compose-relay](https://github.com/nodkz/graphql-compose-relay)
- [x] realize `GraphQL Cursor Connections` wrapper, which extends types dirived via graphql-compose with additional resolvers `connection`. This wrapper implicitly consume `findMany` and `count` resolvers defined in type [graphql-compose-connection](https://github.com/nodkz/graphql-compose-connection)
- [ ] polish `graphq-compose`, add access restrictions to fields, attach custom logic to resolvers, docs and examples
- [ ] write [DataLoader](https://github.com/facebook/dataloader) resolver's wrapper for reducing number of queries
- [ ] add support for PubSub. Introduce subscriptions to your graphql schemas
- [ ] write `graphql-compose-remote-graphql` module, for building your own types which will resolve from 3rd party graphql servers
- [ ] write `graphql-compose-rest` module, for building your own types which will resolve from 3rd party REST api's. It will be prototype for simple and fast realization of your rest wrappers
- [ ] **[need help]** find somebody who write `graphql-compose-sequilze` module like `graphql-compose-mongoose` (need to write types converter, and change resolver functions). Flow type and mocha tests are required!

GraphQL-compose
======================

The `GraphQL-compose` is a module which allows construct flexible graphql schema from different data sources via plugins (Mongoose, DataLoader, Redis, Fetch and so on).
You may extend types, rename fields, reduce access to fields, attach custom logic to resolvers and much more.
Middlewares and converters should solve the problem of mash code in schemas, and ridiculously simplify build process.

THE FUTURE OF CRAZY GRAPHQL SCHEMAS IS NOT SO FAR ;).


Installation
============

```
npm install graphql graphql-compose --save
```
Module `graphql` declared in `peerDependencies`, so it should be installed explicitly in your app, cause internally uses the classes instances checks.


Level 1: TYPES MODIFICATION: modify your GraphQL Object Types anywhere
==========================================
`graphql-compose` has two awesome manipulators. That can change graphql anywhere and anytime before build schema. It allows to create a bunch of awesome wrappers, plugins and middlewares (level 4).
- `TypeComposer` for `GraphQLObjectType`
  - Basic methods:
    - constructor(gqType: GraphQLObjectType)
    - getType(): GraphQLObjectType
    - getTypeName(): string
    - setTypeName(name: string): void
    - getDescription(): string
    - setDescription(description: string): void
  - Working with fields:
    - getFields(): GraphQLFieldConfigMap
    - setFields(fields: GraphQLFieldConfigMap): void
    - getFieldNames(): string[]
    - hasField(fieldName: string): boolean
    - getField(fieldName: string): ?GraphQLFieldConfig
    - addField(fieldName: string, fieldConfig: GraphQLFieldConfig)
    - addFields(newFields: GraphQLFieldConfigMap): void
    - removeField(fieldNameOrArray: string | Array<string>): void
    - getFieldType(fieldName: string): GraphQLOutputType | void
    - getFieldArgs(fieldName: string): ?GraphQLFieldConfigArgumentMap
    - getFieldArg(fieldName: string, argName: string): ?GraphQLArgumentConfig
  - Working with interfaces:  
    - getInterfaces(): Array<GraphQLInterfaceType>
    - setInterfaces(interfaces: Array<GraphQLInterfaceType>): void
    - hasInterface(interfaceObj: GraphQLInterfaceType): boolean
    - addInterface(interfaceObj: GraphQLInterfaceType): void
    - removeInterface(interfaceObj: GraphQLInterfaceType): void
  - New thing: working with automatically converted InputType  
    - getInputType(): GraphQLInputObjectType
    - hasInputTypeComposer()
    - getInputTypeComposer()
  - New thing: working with `RESOLVER (level 2)`
    - getResolvers(): ResolverList
    - hasResolver(name: string): boolean
    - getResolver(name: string): Resolver | void
    - setResolver(resolver: Resolver): void  
    - addResolver(resolver: Resolver): void
    - removeResolver(resolver: string|Resolver): void
  - New thing: obtaining id from `source`
    - hasRecordIdFn(): boolean
    - getRecordIdFn(): GetRecordIdFn
    - getRecordId(source: ?mixed, args: ?mixed, context: ?mixed): string | number
  - New other things
    - clone(newTypeName: string): TypeComposer
    - addRelation(fieldName: string, resolver: Resolver, argsMapper: RelationArgsMapper = {}, opts)
    - getByPath(path: string): TypeComposer | InputTypeComposer | void

- `InputTypeComposer` for `GraphQLInputObjectType`
  - Basic methods:
    - constructor(gqType: GraphQLInputObjectType)
    - getType(): GraphQLInputObjectType
    - getTypeName(): string
    - setTypeName(name: string): void
    - getDescription(): string
    - setDescription(description: string): void
  - Working with fields:
    - getFields(): InputObjectConfigFieldMap
    - getFieldNames(): string[]
    - hasField(fieldName: string): boolean
    - setFields(fields: InputObjectConfigFieldMap): void
    - addField(fieldName: string, fieldConfig: InputObjectFieldConfig)
    - addFields(newFields: InputObjectConfigFieldMap)
    - getField(fieldName: string): ?InputObjectField
    - removeField(fieldNameOrArray: string | Array<string>)
    - getFieldType(fieldName: string): GraphQLInputType | void
  - Helpers for fields
    - isFieldRequired(fieldName: string): boolean
    - makeFieldsRequired(fieldNameOrArray: string | Array<string>)
    - makeFieldsOptional(fieldNameOrArray: string | Array<string>)
  - New other things
    - clone(newTypeName: string): InputTypeComposer
    - getByPath(path: string): InputTypeComposer | void

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

Level 4: PLUGINS
================
Ready plugins for production:
- [graphql-compose-mongoose](https://github.com/nodkz/graphql-compose-mongoose) - right now the most powerful mongoose schema converter to graphql types
- [graphql-compose-relay](https://github.com/nodkz/graphql-compose-relay) - get TypeComposer(GraphQLType + Resolvers) and apply some wrappers to make them Relay compliant.
- [graphql-compose-connection](https://github.com/nodkz/graphql-compose-connection) - extended realization of `GraphQL Cursor Connections`, introduced `filter` and `sort` arguments.

Other
=====

[CHANGELOG](https://github.com/nodkz/graphql-compose/blob/master/CHANGELOG.md)

License
=======
[MIT](https://github.com/nodkz/graphql-compose/blob/master/LICENSE.md)
