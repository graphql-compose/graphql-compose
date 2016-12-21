# GraphQL-compose
[![](https://img.shields.io/npm/v/graphql-compose.svg)](https://www.npmjs.com/package/graphql-compose) 
[![Travis](https://img.shields.io/travis/nodkz/graphql-compose.svg?maxAge=2592000)](https://travis-ci.org/nodkz/graphql-compose)
 [![npm](https://img.shields.io/npm/dt/graphql-compose.svg)](https://www.npmjs.com/package/graphql-compose) 
 [![Join the chat at https://gitter.im/graphql-compose/Lobby](https://badges.gitter.im/nodkz/graphql-compose.svg)](https://gitter.im/graphql-compose/Lobby)
 [![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

`GraphQL-compose` is an instrument which allows you to construct flexible graphql schema from different data sources via plugins. The main aim of `graphql-compose` to solve the problem of mash code in schema's files, and ridiculously simplify schema build process on server.

Compose your GraphQL schema in declarative way: 
- allow easily edit `GraphQL` types (add/remove fields)
- provide an easy way for creating relations between types via `Resolver`s (one time describe outputType, args and resolve method and then use them as you wish). 
- provide converter from `OutputType` to `InputType`
- provide `projection` parser from AST

##Example
country.js
```js
import composeWithMongoose from 'graphql-compose-mongoose'

export const CountrySchema = new mongoose.Schema({
  code: String,
  // ...
});
export const Country = mongoose.model('Country', CountrySchema);
export const CountryTC = composeWithMongoose(Country);
// ... some other stuff for defining graphql type via TypeComposer, eg. relations, restrictions
```
schema.js
```js
import GQC from 'graphql-compose'
import {CountryTC} from './country' 

const ViewerTC = GQC.get('Viewer')
GQC.rootQuery().addField('viewer', {
  type: ViewerTC.getType(),
  description: 'Data under client context',
  resolve: () => ({}),
})

ViewerTC.addField('user', CountryTC.getResolver('findOne').getFieldConfig() )

export default GQC.buildSchema()
```

## Documentation
You can find out documentation here:

[Current version](https://github.com/nodkz/graphql-compose/tree/master/docs)

##Live Demos
- [graphql-compose.herokuapp.com](https://graphql-compose.herokuapp.com/) - Live demo of GraphQL Server (9 models, 14 files, ~750 LOC)
- [nodkz.github.io/relay-northwind](https://nodkz.github.io/relay-northwind) - Live demo of Relay client working with the server above (8 crazy pages, 47 files, ~3000 LOC)


##To-Do list
- [x] write mongoose schema converter to graphql types with CRUD resolver helpers [graphql-compose-mongoose](https://github.com/nodkz/graphql-compose-mongoose)
- [x] write a Relay types wrapper for adding relay specifics things, like `Node` type and interface, `globalId`, `clientMutationId`() [graphql-compose-relay](https://github.com/nodkz/graphql-compose-relay)
- [x] realize `GraphQL Cursor Connections` wrapper, which extends types dirived via graphql-compose with additional resolvers `connection`. This wrapper implicitly consume `findMany` and `count` resolvers defined in type [graphql-compose-connection](https://github.com/nodkz/graphql-compose-connection)
- [ ] polish `graphq-compose`, add access restrictions to fields, attach custom logic to resolvers, docs and examples
- [ ] write [DataLoader](https://github.com/facebook/dataloader) resolver's wrapper for reducing number of queries
- [ ] add support for PubSub. Introduce subscriptions to your graphql schemas
- [ ] write `graphql-compose-remote-graphql` module, for building your own types which will resolve from 3rd party graphql servers
- [ ] write `graphql-compose-rest` module, for building your own types which will resolve from 3rd party REST api's. It will be prototype for simple and fast realization of your rest wrappers
- [ ] **[need help]** find somebody who write `graphql-compose-sequilze` module like `graphql-compose-mongoose` (need to write types converter, and change resolver functions). Flow type and mocha tests are required!

##Immediate goal
- Obtain better filtering customization (https://github.com/nodkz/graphql-compose/issues/3)

##In future
- Add [DataLoader](https://github.com/facebook/dataloader) wrapper for `findById` resolvers.
- Some better API for building schema with restrictions in `graphql-compose`
- Somehow implement `subscriptions`

##Other
[CHANGELOG](https://github.com/nodkz/graphql-compose/blob/master/CHANGELOG.md)

##License
[MIT](https://github.com/nodkz/graphql-compose/blob/master/LICENSE.md)
