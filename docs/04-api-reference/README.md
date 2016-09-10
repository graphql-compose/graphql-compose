# API reference

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