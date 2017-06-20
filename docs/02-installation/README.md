# Installation

```
npm install graphql graphql-compose --save
```
Module `graphql` declared in `peerDependencies`, so it should be installed explicitly in your app, cause internally uses the classes instances checks.

Please note that this will install the composer itself. In order to generate the TypeComposer objects you need to either manually create them or use plugins [graphql-compose-mongoose](https://github.com/nodkz/graphql-compose-mongoose), [graphql-compose-elasticsearch](https://github.com/nodkz/graphql-compose-elasticsearch).
