---
id: understanding-types
title: Type creation
---

With `graphql-compose` you need to create types under some `schemaComposer` instance. By default `graphql-compose` has a global `schemaComposer` instance which can be obtained in the following manner:

```js
import { schemaComposer } from 'graphql-compose';
```

But if you need to create several GrasphQL schemas in your app, you may import `SchemaComposer` class and create `schemaComposer` instances as much as you need:

```js
import { SchemaComposer } from 'graphql-compose';

const schemaComposer1 = new SchemaComposer();
const schemaComposer2 = new SchemaComposer();
```

Take a note that `schemaComposer1` and `schemaComposer2` will have different type storages. And types in `schemaComposer1` will not be avaliable in `schemaComposer2` and vice versa.

## Scalar types

Graphql-compose has following built-in scalar types:

- `String`
- `Float`
- `Int`
- `Boolean`
- `ID`
- `Date`
- `JSON`

### via config

You may create scalar types via config, like with GraphQLScalarType:

```js
const ScalarTC = schemaComposer.createScalarTC({
  name: 'UInt',
  description: 'Unsigned integer',
  serialize: () => {},
  parseValue: () => {},
  parseLiteral: () => {},
});
```

### via SDL

```js
const ScalarTC = schemaComposer.createScalarTC('scalar UInt');

// or
const ScalarTC = schemaComposer.createScalarTC('UInt');
ScalarTC.setDescription('Unsigned integer');
ScalarTC.setSerialize(() => {});
ScalarTC.setParseValue(() => {});
ScalarTC.setParseLiteral(() => {});
```

## Object types via ObjectTypeComposer

If you need to create some complex type with several properties (fields), you will need to use [ObjectTypeComposer](api/ObjectTypeComposer.md). It's a builder for `GraphQLObjectType` object.

`ObjectTypeComposer` has very convenient ways of type creation.

### via config

Most recommended way to define your Output type. Such definition provides better developer experience with jumping to the type declarations.

```js
const AuthorTC = schemaComposer.createObjectTC({
  name: 'Author',
  fields: {
    id: 'Int!',
    firstName: 'String',
    lastName: 'String',
    posts: {
      type: () => [PostTC], // arrow function fot `type` helps to solve hoisting problems and keep ability to list all fields
      args: {
        limit: { type: 'Int', defaultValue: 20 },
        skip: 'Int', // shortand to `{ type: 'Int' }`
        sort: `enum AuthorPostsSortEnum { ASC DESC }`, // type creation via SDL
      },
      resolve: () => { ... },
    }
  },
});
```

Also this way of definition provides a lot of syntax sugar for field definition:

```js
const AuthorTC = schemaComposer.createObjectTC({
  posts: {
    // wrapping Type with arrow function helps to solve a hoisting problem
    // also using type instances provides better DX
    // (ctrl+click allows to jump to PostTC type declaration in your IDE)
    type: () => PostTC,
    description: 'Posts written by Author',
    resolve: (source, args, context, info) => {},
  },
  // using standard GraphQL Type
  ucFirstName: {
    type: GraphQLString,
    resolve: (source) => { return source.firstName.toUpperCase(); },
    // also request `firstName` field which must be loaded from database
    projection: { firstName: true },
  },
  // fast way if you need to define only type
  counter: 'Int',
  // using SDL for definition new ObjectType
  complex: `type ComplexType {
    subField1: String
    subField2: Float
    subField3: Boolean
    subField4: ID
    subField5: JSON
    subField6: Date
  }`,
  // SDL for defining array of strings, which is NonNull
  list0: {
    type: '[String]!',
    description: 'Array of strings',
  },
  list1: '[String]',
  list2: ['String'],
  list3: [GraphQLString],
  list4: [`type Complex2Type { f1: Float, f2: Int }`],
});
```

### via SDL

May have hoisting problems. Be aware that all used complex types must be already defined.

```js
const AuthorTC = schemaComposer.createObjectTC(`
  type Author {
    id: Int!
    firstName: String
    lastName: String
  }
`);
```

### via GraphQLObjectType

This is very useful when you want modify existed `GraphQLObjectType`.

```js
const AuthorType = new GraphQLObjectType(...)
const AuthorTC = schemaComposer.createObjectTC(AuthorType);
AuthorTC.removeField('lastName');
AuthorTC.getType(); // returns modified GraphQLObjectType
```

### without fields

Useful when you write your own type generators.

```js
import { schemaComposer } from 'graphql-compose';

const AuthorTC = schemaComposer.createObjectTC('Author');
AuthorTC.addFields({ ... });
```

## Input types via InputTypeComposer

GraphQL allows to pass arguments for fields. You may freely use `Scalar`s, `Enum`s when describing input args. But what you should do in the case of mutations, where you might want to pass in a whole object to be created? For such cases for complex types instead of `GraphQLObjectType` you should use `GraphQLInputObjectType`. They they have small differences in its fields declaration:

- input object type has `defaultValue`
- input object type does not have `args`
- input object type does not have `resolve` method

If you need to create some complex type with several properties, you will need to use [InputTypeComposer](api/InputTypeComposer.md). It's a builder for `GraphQLInputObjectType` object.

`InputTypeComposer` has very convenient ways of type creation.

### via config

Most recommended way to define your Input type. Such definition provides hoisting problems solution via wrapping types by arrow function. Better developer experience with jumping to the type declarations.

`InputTypeComposer` has the same type definition capabilities for describing fields as `ObjectTypeComposer` - as string, as arrow function, as SDL.

```js
const AuthorITC = schemaComposer.createInputTC({
  name: 'AuthorInput',
  fields: {
    id: 'Int!',
    firstName: 'String',
    lastName: 'String',
    status: {
      type: 'String',
      defaultValue: 'new',
    }
    address: () => AddressITC,
    location: `input type LonLatInput { lon: Float, lat: Float }`,
  },
});
```

### via existed ObjectTypeComposer

You may convert your existed output type to input type.

```js
const AuthorTC = schemaComposer.createObjectTC({ ... });
const AuthorITC = AuthorTC.getITC(); // returns InputTypeComposer
```

### via SDL

```js
const AuthorITC = schemaComposer.createInputTC(`
  input AuthorInput {
    id: Int!
    firstName: String
    lastName: String
    status: String @default(value: "new")
  }
`);
```

### via GraphQLInputObjectType

This is very useful when you want modify existed `GraphQLInputObjectType`.

```js
const AuthorInput = new GraphQLInputObjectType(...)
const AuthorITC = schemaComposer.createInputTC(AuthorInput);
AuthorITC.removeField('status');
AuthorITC.getType(); // returns modified GraphQLInputObjectType
```

### without fields

Useful when you write your own type generators.

```js
import { schemaComposer } from 'graphql-compose';

const AuthorITC = schemaComposer.createInputTC('AuthorInput');
AuthorITC.addFields({ ... });
```

## Enum types via EnumTypeComposer

If you need to create enum type, you will need to use [EnumTypeComposer](api/EnumTypeComposer.md). It's a builder for `GraphQLEnumType` object.

`EnumTypeComposer` has very convenient ways of type creation.

### via config

Most recommended way to define your Enum type. Such definition provides to set own values for every key.

```js
const StatusETC = schemaComposer.createEnumTC({
  name: 'StatusEnum',
  values: {
    NEW: { value: 0 },
    APPROVED: { value: 1 },
    DECLINED: { value: 2 },
  },
});
```

### via SDL

```js
const StatusETC = schemaComposer.createEnumTC(`
  enum StatusEnum { NEW APPROVED DECLINED }
`);
```

### via GraphQLEnumType

This is very useful when you want modify existed `GraphQLEnumType`.

```js
const StatusEnum = new GraphQLEnumType(...)
const StatusETC = schemaComposer.createEnumTC(StatusEnum);
StatusETC.removeField('NEW');
StatusETC.getType(); // returns modified GraphQLEnumType
```

### without fields

Useful when you write your own type generators. Enum has values (not fields), but for similar method naming with `ObjectTypeComposer` and `InputTypeComposer` in `graphql-compose` methods for value modification have `field` keyword.

```js
import { schemaComposer } from 'graphql-compose';

const StatusETC = schemaComposer.createEnumTC('StatusEnum');
StatusETC.addFields({ ... });
```

## Union types via UnionTypeComposer

Graphql-compose provides the following helper for `Union` types - [UnionTypeComposer](api/UnionTypeComposer.md).

```js
import { schemaComposer } from 'graphql-compose';

const DogTC = schemaComposer.createObjectTC({ name: 'Dog', ... });
const CatTC = schemaComposer.createObjectTC({ name: 'Cat', ... });

const PetTC = schemaComposer.createUnionTC({
  name: 'Pet',
  types: [ DogTC, CatTC ],
  resolveType(value) {
    if (value instanceof Dog) {
      return DogType;
    }
    if (value instanceof Cat) {
      return CatType;
    }
  }
});

// You may use UnionTypeComposer for field definition in ObjectTypeComposer
AuthorTC.addFields({
  favoritePet: PetTC,
});
```

## Interfaces via InterfaceTypeComposer

Graphql-compose provides the following helper for `Interfaces` - [InterfaceTypeComposer](api/InterfaceTypeComposer.md).

```js
import { schemaComposer } from 'graphql-compose';

const TimestampInterface = schemaComposer.createInterfaceTC({
  name: 'Timestampable',
  description: 'An object with createdAt and updatedAt fields',
  fields: {
    createdAt: 'Date',
    updatedAt: 'Date',
  },
});

// When you create Interface, you need to provide instructions how to determine exact ObjectType from `value`.
// So if `value` is instance of UserDoc, then use `UserTC` as exact type.
TimestampInterface.addTypeResolver(UserTC, value => (value instanceof UserDoc));
TimestampInterface.addTypeResolver(ArticleTC, value => (value instanceof UserDoc));
```

## Lists

If you want indicate that field or argument return an array of some type, you may do the following:

```js
import { GraphQLList } from 'graphql';

SomeTypeComposer.addFields({
  field1: [AuthorTC], // RECOMMENDED just wrap in the regular js array
  field2: AuthorTC.getTypePlural(), // call specific ObjectTypeComposer method
  field3: '[Author]', // use SDL format
  field4: new GraphQLList(AuthorTC.getType()) // use standard GraphQLList
});
```

## Non-Null

If you want indicate that field is not empty or argument is required:

```js
import { GraphQLNonNull } from 'graphql';

SomeTypeComposer.addFields({
  // field1: ???, // doesn't exists any regular object in js for expressing NonNull value
  field2: AuthorTC.getTypeNonNull(), // call specific ObjectTypeComposer method
  field3: 'Author!', // use SDL format
  field4: new GraphQLNonNull(AuthorTC.getType()) // use standard GraphQLNonNull
});
```

Non-Null List of Non-Null values may be expressed in following way:

```js
import { GraphQLNonNull, GraphQLList } from 'graphql';

SomeTypeComposer.addFields({
  field3: '[Author!]!', // use SDL format
  field4: new GraphQLNonNull( // use standard GraphQLNonNull & GraphQLList
    new GraphQLList(
      new GraphQLNonNull(AuthorTC.getType())
    )
  )
});
```
