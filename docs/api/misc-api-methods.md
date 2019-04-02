---
id: misc-api-methods
title: API misc
---

Graphql-compose package also exports several useful methods, classes and types for writing own plugins and type generators.

All listed methods and classes in this doc can be imported directly from `graphql-compose` package.

```js
import {
  graphql, upperFirst, isObject, isFunction, TypeStorage, GraphQLDate, ...etc
} from 'graphql-compose';
```

## Util methods

### toInputObjectType()

Converts `GraphQLObject` type wrapped with `ObjectTypeComposer` to `GraphQLInputObjectType` wrapped with `InputTypeComposer`.

```flow
function toInputObjectType(
  tc: ObjectTypeComposer<any>,
  opts?: {
    prefix?: string;
    postfix?: string;
  }
): InputTypeComposer;
```

Can be used in following way:

```js
import { GraphQLObjectType } from 'graphql';
import { toInputObjectType, schemaComposer } from 'graphql-compose';

const GraphQLUserType = new GraphQLObjectType({ ... });
const UserTC = schemaComposer.createObjectType(GraphQLUserType);
const UserITC = toInputObjectType(UserTC);
const GraphQLUserInput = UserITC.getType(); // returns GraphQLInputObjectType
```

### getProjectionFromAST()

Traverse `infoAST` from `resolve` function argument and provide `projection` (requested fields in the query).

```flow
export type ProjectionType = { [fieldName: string]: ProjectionType | true };

function getProjectionFromAST(
  context: GraphQLResolveInfo,
  fieldNode?: FieldNode | InlineFragmentNode | FragmentDefinitionNode
): ProjectionType;
```

```js
import { getProjectionFromAST } from 'graphql-compose';

function resolve(source, args, context, info) {
  const projection = getProjectionFromAST(info);
  // returns something like
  // {
  //   firstname: true,
  //   lastname: true,
  //   address: {
  //     city: true,
  //     street: true,
  //   },
  // }
}
```

### getFlatProjectionFromAST()

```flow
function getFlatProjectionFromAST(
  context: GraphQLResolveInfo,
  fieldNodes?: FieldNode | InlineFragmentNode | FragmentDefinitionNode
): { [fieldName: string]: true };
```

The same as `getProjectionFromAST` except that all nested fields will not be extracted. Complex `address` will be just `true`, not `{ city: true, street: true }`,

```flow
import { getFlatProjectionFromAST } from 'graphql-compose';
```

```js
function resolve(source, args, context, info) {
  const projection = getFlatProjectionFromAST(info);
  // returns something like
  // {
  //   firstname: true,
  //   lastname: true,
  //   address: true,
  // }
}
```

### isString()

```flow
function isString(value: ?mixed): boolean
```

### isObject()

```flow
function isObject(value: ?mixed): boolean
```

### isFunction()

```flow
function isFunction(value: ?mixed): boolean
```

### resolveMaybeThunk()

If `thingOrThunk` is a function it will be called and returned its result. If other value it will be return as is.

```flow
function resolveMaybeThunk(thingOrThunk: Function | mixed): mixed;
```

```js
resolveMaybeThunk('hey'); // 'hey'
resolveMaybeThunk({ a: 1 }); // { a: 1 }
resolveMaybeThunk(() => 'wow'); // 'wow'
```

### camelCase()

```flow
function camelCase(str: string): string;
```

```js
camelCase('Hello how are you'); // 'helloHowAreYou'
```

### getPluralName()

```flow
function getPluralName(name: string): string;
```

```js
getPluralName('author'); // 'authors'
getPluralName('child'); // 'children'
getPluralName('person'); // 'people'
getPluralName('ox'); // 'oxen'
getPluralName('my field'); // 'myFields'
```

### upperFirst()

```flow
function upperFirst(str: string): string;
```

```js
upperFirst('author'); // 'Author'
upperFirst('my type'); // 'My type'
upperFirst('my_type'); // 'My_type'
```

### clearName()

Keep only valid characters `_a-zA-Z0-9` for graphql field & type names.

```flow
function clearName(str: string): string;
```

```js
clearName('author'); // 'author'
clearName('my type'); // 'mytype'
clearName('my_type#2048@!'); // 'my_type2048'
```

### omit()

Remove properties from Object by its names.

```flow
function omit(obj: Object, keys: string[]);
```

```js
omit({ a: 1, b: 2, c: 3 }, ['a', 'd']); // { b: 2, c: 3 }
omit({ a: 1, b: 2, c: 3 }, 'c'); // { a: 1, b: 2 }
```

### only()

Keep only listed properties in Object.

```flow
function only(obj: Object, keys: string[]);
```

```js
only({ a: 1, b: 2, c: 3 }, ['a', 'd']); // { a: 1 }
only({ a: 1, b: 2, c: 3 }, 'c'); // { c: 3 }
```

### inspect()

Used to print any values as a string in error messages.

```js
inspect(value: mixed): string
```

### toDottedObject()

Convert object to dotted-key/value pair.

```flow
function toDottedObject(
 obj: Object,
 target?: Object = {},
 path?: string[] = []
): { [dottedPath: string]: mixed }
```

```js
toDottedObject({ a: { b: { c: 1 } } });
// { 'a.b.c': 1 }

toDottedObject({ a: { b: [{ c: 1 }, { d: 1 }] } });
// { 'a.b.0.c': 1, 'a.b.1.d': 1 }
```

### deepmerge()

JS world has several `deepmerge` implementations. This implementation is designed for merging `projection`s and `fields` with keeping all values in arrays.

```flow
function deepmerge(
  target: Object | Array,
  src: Object | Array
): Object | Array
```

```js
deepmerge([1, 2], [3, 4]);
// [1, 2, 3, 4]

deepmerge({ a: 1 }, { b: 2 });
// { a: 1, b: 2 }

deepmerge({ a: 1 }, { a: 2, b: 2 });
// { a: 2, b: 2 }

deepmerge({ a: { aa: 1 } }, { a: { bb: 2 } });
// { a: { aa: 1, bb: 2 } }

deepmerge({ a: { aa: [1] } }, { a: { aa: [2] } });
// { a: { aa: [1, 2] } }

deepmerge([{ a: { aa: [1] } }], [{ a: { aa: [2] } }]);
// [{ a: { aa: [1, 2] } }]
```

### filterByDotPaths()

This method is useful for debug purposes. When you want to log in console only part of some complex object.

```flow
function filterByDotPaths(
  obj: Object,
  pathsFilter: string | string[],
  opts?: {
    hideFields: { [fieldPath: string]: string },
    hideFieldsNote?: string,
  },
): Object
```

```js
const data = {
  source: {
    name: 'nodkz',
    age: 30,
    location: {
      country: 'KZ',
      city: 'Almaty',
    },
  },
  args: {
    data: [{ id: 1 }, { id: 2 }],
  },
};

filterByDotPaths(data, 'source.age'); // { 'source.age': 30 }
filterByDotPaths(data, 'args.data.1.id'); // { args.data.1.id': 2 }

filterByDotPaths(data, ['source.age', 'args.data.1.id', 'source.name']);
// { 'source.age': 30, 'args.data.1.id': 2, 'source.name': 'nodkz' }

filterByDotPaths(data, 'source.age, args.data.1.id source.name  ');
// { 'source.age': 30, 'args.data.1.id': 2, 'source.name': 'nodkz' }

filterByDotPaths(data, null, {
  hideFields: {
    args: 'was hidden',
    'source.*': 'is complex type, so its value was hidden',
  },
});
// {
//   args: 'Object {} was hidden',
//   source: {
//     age: 30,
//     location: 'Object {} is complex type, so its value was hidden',
//     name: 'nodkz',
//   },
// }
```

## GraphQL.js re-export

### graphql

`graphql-compose` re-exports `GraphQL.js` package for its plugins. It helps to avoid the hell with maintaining versions of `graphql` and `graphql-compose` in plugins' `package.json` files.

If you want to write a `plugin` for `graphql-compose` and publish it to npm, just add `graphql-compose` in `dependencies` of its `package.json`. And if you will need `GraphQL.js` objects and methods you may import them in such way:

```js
// My awesome Plugin for graphql-compose
import { graphql } from 'graphql-compose';

const { GraphQLNonNull, GraphQLObjectType } = graphql;
```

### graphqlVersion

Sometimes it need to know which version of `GraphQL.js` is installed in the project.
It may be used in graphql-compose plugins, cause different versions of `GraphQL.js` may have breaking changes and your plugins may have workarounds for different behavior.

```flow
const graphqlVersion: number;
```

```js
import { graphqlVersion } from 'graphql-compose';

if (graphqlVersion < 13) {
  throw Error(`This plugin does not work with GraphQL.js v${graphqlVersion}`);
}
```

## Scalar Types

### GraphQLDate

GraphQL scalar type that converts javascript `Date` object to string `YYYY-MM-DDTHH:MM:SS.SSSZ` and back.

```flow
import { GraphQLDate } from 'graphql-compose';
```

### GraphQLJSON

GraphQL scalar type that represents `JSON`. Field with this type may have arbitrary structure. Copied from @taion's [graphql-type-json](https://github.com/taion/graphql-type-json) for reducing dependencies tree.

```flow
import { GraphQLJSON } from 'graphql-compose';
```

## TypeStorage

You may need some isolated storage for keeping types in your plugins. So `TypeStorage` is the easy way to obtain such storage.

```flow
import { TypeStorage, ObjectTypeComposer } from 'graphql-compose';

const customStorage = new TypeStorage();

const TempType = ObjectTypeComposer.createTemp(`
  type TempType {
    field: String
  }
`);
customStorage.add(TempType);
customStorage.has('TempType'); // true
```

### add()

```flow
add(
  value: ComposeType
): ?string
```

### hasInstance()

```flow
hasInstance(
  typeName: string,
  ClassObj: typeof ComposeType
): boolean
```

### getOrSet()

```flow
getOrSet(
  typeName: string,
  typeOrThunk: ComposeType | (() => ComposeType)
): V<TContext>
```

### clear()

Remove all types from Schema

```flow
clear(): void
```

### delete()

```flow
delete(typeName: string): boolean
```

### entries()

```flow
entries(): Iterator<[string, ComposeType]>
```

### forEach()

```flow
forEach(
 callbackfn: (
   value: ComposeType,
   index: string,
   map: Map<string, ComposeType>
 ) => mixed,
 thisArg?: any
): void
```

### get()

```flow
get(typeName: string): ComposeType
```

### has()

```flow
has(typeName: string): boolean
```

### keys()

```flow
keys(): Iterator<string>
```

### set()

```flow
set(
  typeName: string,
  value: ComposeType
): TypeStorage<TContext>
```

### values()

```flow
values(): Iterator<ComposeType>
```
