# Installation

```
npm install graphql graphql-compose --save
```
Module `graphql` declared in `peerDependencies`, so it should be installed explicitly in your app, cause internally uses the classes instances checks.

Please note that this will install the composer itself. in order to generate the TypeComposer objects you need to either manually create them or use a plugin lik `graphql-compose-mongoose`.
 