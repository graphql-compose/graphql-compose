---
id: type-modification
title: Type modification
---

This is the most important part of `graphql-compose` and the main difference in Schema creation with `GraphQL.js`. In `GraphQL.js` you have strict abilities in type definition and its further modification. But `graphql-compose` allows to you modify types after creation in very convenient ways.

> **Note:** With `graphql-compose` you may modify types before `GraphQLSchema` object creation. When schema was created you cannot change types.

## Fields modification

Available methods in `ObjectTypeComposer`, `InputTypeComposer`, `EnumTypeComposer`, `InterfaceTypeComposer` instances:

- getFields()
- setFields()
- getFieldNames()
- hasField(name)
- setField(name, fieldConfig)
- addFields(newFieldsConfig)
- getField(name)
- removeField(nameOrArray)
- removeOtherFields(nameOrArray)
- extendField(name, partialFieldConfig)
- reorderFields(names)
- deprecateFields(nameOrMap)

Additional methods in `ObjectTypeComposer`, `InputTypeComposer`, `InterfaceTypeComposer` instances:

- getFieldType(name)
- getFieldTC(name)
- getFieldConfig(name)
- makeFieldNonNull(nameOrArray)
- makeFieldNullable(nameOrArray)
- addNestedFields(newFields)

```js
// add description to `firstName`
AuthorTC.extendField('firstName', {
  description: "This field returns Author's first name",
});

// Add new field `status` with Enum type
AuthorTC.addField('status', `enum AuthorStatus { ACTIVE INACTIVE }`);

// Change order of fields in type
// unlisted fields will be added to the end of field list with old order
AuthorTC.reorderFields(['status', 'firstName']);

// Mark fields as deprecated with some message
AuthorTC.deprecateFields({
  rating: 'This field will be removed in June 2018',
  dob: 'Use `age` field instead. This field will be removed in June 2018',
});

// Add new field with `address` name and for type
// create a new object type with `city` and `country` fields
AuthorTC.addNestedFields({
  'address.city': 'String',
  'address.country': 'String',
});
```

## Type modification

Available methods in `ObjectTypeComposer`, `InputTypeComposer`, `EnumTypeComposer`, `InterfaceTypeComposer`, `UnionTypeComposer` instances:

- getType()
- getTypePlural()
- getTypeNonNull()
- getTypeName()
- setTypeName(newName)
- getDescription()
- setDescription()
- clone(newTypeName)

Additional methods in `ObjectTypeComposer`

- getInterfaces()
- setInterfaces(interfaces)
- hasInterface(interfaceObj)
- addInterface(interfaceObj)
- removeInterface(interfaceObj)
- getInputType()
- getITC()

## Create your custom modification function

With this set of methods, you may write your own type modification functions. It may greatly reduce repetitive code across your schema definition.

As an example, lets write a function which will add `rawData` field with full record data from database. Also check `isAdmin = true` in `context` and if so return data, otherwise return null.

```js
function addRawData(tc: ObjectTypeComposer<any, any>) {
  if (!tc.hasField('rawData')) {
    tc.addField('rawData', {
      type: 'JSON',
      resolve: (source, args, context) => {
        if (context.isAdmin) {
          return source;
        }
        return null;
      },
      // add magic property `projection`
      // which request all fields from database
      // when requested this `rawData` field in the query
      projection: { '*': 1 },
    });
  }
}
addRawData(AuthorTC);
addRawData(PostTC);
```

## Or even more

You may write your own plugins which will generate types from some models or non-graphql schemas. Take a look on [avaliable list of plugins](plugins/list-of-plugins.md) build on top of `graphql-compose`.
