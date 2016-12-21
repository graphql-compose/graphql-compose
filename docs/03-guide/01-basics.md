# GraphQL compose basics
Graphql-compose consists from several classes and utilities. Its combination allows to create plugins or helper methods that modify graphql types.

### TypeComposer
Main class that gets `GraphQLObjectType` (complex **output** type with fields) and provide ability to change them
- get and check presence of fields and interfaces
- add, remove, extend fields
- add relations with other types
- clone type
- manipulate type interfaces
- produce input object type
- keep list of `Resolver`s methods for quering/updating data
- create output types with `GraphQL schema language`

### InputTypeComposer
Class that get `GraphQLInputObjectType` (complex **input** type with fields) and provide ability to change it
- get and check presence of fields
- add, remove fields
- make fields required or optional (wrap/unwrap with `GraphQLNonNull`)
- clone type
- create input types with `GraphQL schema language`

### Resolver
The most interesting class in `graphql-compose`. In terms of GraphQL it is `GraphQLFieldConfig` with additional functionality and consists from following properties:
- `type` output complex or scalar type (resolver returns data of this type)
- `args` list of field of input or scalar types (resolver accept input arguments for `resolve` method)
- `resolve` method which gather data from data-source
- `description` public description which will be passed to graphql schema and will be available via introspection
- `deprecationReason` if you want to hide field from schema, but leave it working for old clients
- `name` any name for resolver that allow to you identify what it does, eg `findById`, `updateMany`, `removeOne`
- `parent` you may wrap `Resolver` for adding additional checks, modifying result, adding arguments... so here we keep reference to previous wrapped Resolver
- `kind` type of resolver `query` (resolver just fetch data) or `mutation` (resolver may change data)

The main aim of `Resolver` to keep available resolve methods for Type and use them for building relation with other types.
`Resolver` provide following abilities:
- Add, remove, get, make optional/required arguments
- Clone resolver
- Wrap args, type, resolve (get resolver and create new one with extended/modified functionality)
- Provide helper methods `addFilterArg` and `addSortArg` which wrap resolver by adding argument and resolve logic

### TypeMapper

### Storage (GQC)

### Utilities

#### Types

#### toInputObjectType

#### projection

#### typeByPath
