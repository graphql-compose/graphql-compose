
##03 - Edit TypeComposers
Sooner or later you need to edit the composers. There are functions to get and set one or more fields, aswell as you can get data from the fields to


### Remove fields
```js
UserTC.removeField('email')
```


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