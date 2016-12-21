##06 - Relay
Adding support for relay is done with the [Relay plugin](https://github.com/nodkz/graphql-compose-relay) For more detailed descriptions on how to use and reporing issues please use the link.

### Importing and installing
Installation:
```js
npm i -S graphql-compose-relay
```
Importing:
```js
import composeWithRelay from 'graphql-compose-relay'
```

###Add support in TypeComposers
It cant be more simple than this:
```js
export const PersonTC = composeWithRelay(composeMongoose(Person))
```

###Add support in RootQuery
```js
composeFromRelay(GQC.rootQuery())
```
