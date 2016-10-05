
##03 - Edit TypeComposers
Sooner or later you need to edit the composers. There are functions to get and set one or more fields, aswell as you can get data from the fields to

### Hide fields (projection)
In order to hide fields on your TC you should do this when you add it on the relationship.. 
```js
ViewerTC.addRelation(
  'user',
  () => ({
    resolver: UsersTC.getResolver('findById'),
    args: {
       _id: (source, args, context, info) => context.userId,
    },
    projection: { _id: false }
  })
)
ViewerTC.addRelation(
  'users',
  () => ({
    resolver: UsersTC.getResolver('findMany'),
    projection: { _id: false, email: false, gender: false, age: false }
  })
)
```
In this way you can have multiple relationships and show Users in different ways. Example would be logged in user have more data than searching for others.


### Remove fields
```js
UserTC.removeField('email')
```
___REMEMBER: This will remove the field in all objects where this TC is used___

### Adding fields
```js
UserTC.addField(
  'fullName',
  {
    type: GraphQLString,
    resolver: (source) => `${source.firstName} ${source.lastName}`,
    projection: { firstName: true, lastName: true }, 
  }
)
```
___REMEMBER: If you do not provide projection result will be undefined undefined___


###Field functions
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