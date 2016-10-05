# API reference



## `TypeComposer` for `GraphQLObjectType`

#### - Basic methods
```js
  constructor(gqType: GraphQLObjectType)
  getType(): GraphQLObjectType
  getTypeName(): string
  setTypeName(name: string): void
  getDescription(): string
  setDescription(description: string): void
```
#### - Working with fields
```js
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
```
#### - Interfaces
```js
  getInterfaces(): Array<GraphQLInterfaceType>
  setInterfaces(interfaces: Array<GraphQLInterfaceType>): void
  hasInterface(interfaceObj: GraphQLInterfaceType): boolean
  addInterface(interfaceObj: GraphQLInterfaceType): void
  removeInterface(interfaceObj: GraphQLInterfaceType): void
```
#### - Automatically converted InputType
```js
  getInputType(): GraphQLInputObjectType
  hasInputTypeComposer()
  getInputTypeComposer()
```
#### - Resolvers
```js
  getResolvers(): ResolverList
  hasResolver(name: string): boolean
  getResolver(name: string): Resolver | void
  setResolver(resolver: Resolver): void  
  addResolver(resolver: Resolver): void
  removeResolver(resolver: string|Resolver): void
```
#### - Relationships
```js
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
```
#### - Misc
```js
  hasRecordIdFn(): boolean
  getRecordIdFn(): GetRecordIdFn
  getRecordId(source: ?mixed, args: ?mixed, context: ?mixed): string | number
  clone(newTypeName: string): TypeComposer
  getByPath(path: string): TypeComposer | InputTypeComposer | void
```




## `InputTypeComposer` for `GraphQLInputObjectType`

#### - Basic methods
```js
  constructor(gqType: GraphQLInputObjectType)
  getType(): GraphQLInputObjectType
  getTypeName(): string
  setTypeName(name: string): void
  getDescription(): string
  setDescription(description: string): void
```
#### - Fields
```js
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
  isFieldRequired(fieldName: string): boolean
  makeFieldsRequired(fieldNameOrArray: string | Array<string>)
  makeFieldsOptional(fieldNameOrArray: string | Array<string>)
  clone(newTypeName: string): InputTypeComposer
  getByPath(path: string): InputTypeComposer | void
```

