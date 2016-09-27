##03 - Generate TypeComposers

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


### Hiding fields (Projection)
Example if you want to explicit hide fields that are in the database and not set as hidden. you can use `projection: {}` 

```js
ViewerTC.addRelation(
  'userSearch',
  () => ({
    resolver: UsersTC.getResolver('findMany'),
    args: {
      filter: source => ({ email: source.email })
    },
    projection: {
        address: false,
        city: false, 
    },
  })
)
```