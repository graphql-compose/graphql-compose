
## 03 - Edit TypeComposers
Sooner or later you need to edit the composers. There are functions to get and set one or more fields, aswell as you can get data from the fields to

### Hide fields (projection)
In order to hide fields on your TC you should do this when you add it on the relationship.
```js
ViewerTC.addRelation(
  'user',
  () => ({
    resolver: UsersTC.getResolver('findById'),
    args: {
       _id: (source, args, context, info) => context.userId,
    },
  })
);

ViewerTC.addRelation(
  'users',
  () => ({
    resolver: UsersTC.getResolver('findMany'),
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
UserTC.addFields({
  fullName: {
    type: 'String',
    resolve: (source) => `${source.firstName} ${source.lastName}`,
    projection: { firstName: true, lastName: true },
  }
});

UserTC.addFields({
  age: {
    type: 'Int',
    // other field config properties
  }
  ageShort: 'Int', // just type
  complex: {
    type: `type Address {
      city: String
      street: String
    }`,
    // other field config properties
  },
  complexShort: `type AddressShort {
    city: String
    street: String
  }`
});
```
___REMEMBER: If you do not provide projection result will be undefined undefined___


### Field functions
```js
getFieldNames(): string[]
getField(fieldName: string): ?GraphQLFieldConfig
getFields(): GraphQLFieldConfigMap
setFields(fields: GraphQLFieldConfigMap): void
setField(fieldName: string, fieldConfig: GraphQLFieldConfig)
addFields(newFields: GraphQLFieldConfigMap): void
hasField(fieldName: string): boolean
removeField(fieldNameOrArray: string | Array<string>): void
getFieldType(fieldName: string): GraphQLOutputType | void
getFieldArgs(fieldName: string): ?GraphQLFieldConfigArgumentMap
getFieldArg(fieldName: string, argName: string): ?GraphQLArgumentConfig
extendField(fieldName: string, parialFieldConfig: GraphQLFieldConfig): GraphQLFieldConfig)
```
