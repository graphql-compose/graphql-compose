# Plugins

There are a number of different plugins you can use to both compile and edit the Schema setup.
This could be used for compiling a schema from a database model (currently only supports mongoose) to Relay, connections and more.

#### [graphql-compose-connection](https://github.com/nodkz/graphql-compose-connection) - resolver constructor (TypeTC -> TypeTC + 1 resolver)
- It is `connection` resolver constructor, that use `findMany` and `count`resolvers which creates for you [RelayConnectionType](https://facebook.github.io/relay/graphql/connections.htm).
- adds `sort` and `filter` to args (no one library does not realize this complex logic. It store `sort` and `filter` values in `cursor`). How it works described [here](https://github.com/RisingStack/graffiti-mongoose/issues/99#issuecomment-234524046)

Well tested with mocha and chai.

#### [graphql-compose-mongoose](https://github.com/nodkz/graphql-compose-mongoose) - model converter (MongooseModel -> TypeTC)
- It's mongoose model converter, that using `graphql-compose` for building one main type ObjectType (`graphql-compose` helps to convert ObjectType to InputObject)
- Create commonly used `Resolvers` with a bunch of so-called subtypes (filter, args, sorts, inputs). For providing build relations in your schema with `graphql-compose`.
- Internally used `graphql-compose-connection` for creating `connection` resolvers. Also it checks indexes on your mongoose fields and adds them to `sort` arg.

Well tested with mocha and chai.

#### [graphql-compose-relay](https://github.com/nodkz/graphql-compose-relay) - type converter (TypeTC -> TypeTC prepared for Relay)
- adds Node interface to wrapped Type
- adds `id` field or wrap existed in MainType, for providing global uniq id via base64(typeName:id)
- adds `node` field to `rootQuery` that resolves objects by it's global id
- traverse by `mutation resolvers` and change its outputTypes adds `clientMutationId`, wraps `resolver` to pass `clientMutationId` from args to the `OutputType`
- traverse by `all resolvers` and move all args into one `input` arg, for Relay compatibility  

Well tested with mocha and chai.