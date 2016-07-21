## master

## 0.0.10 (July 21, 2016)
- Change `addRelation` method. Now it maps arguments, and strip out provided args from field config.

## 0.0.9 (July 20, 2016)
- Add method `getFlatProjectionFromAST`, which returns projection only for first level
- `toInputObjectType` now works with TypeComposer, rather than GraphQLType (if TypeComposer already has InputType, then it does not generate new one)
- Clear types' fields, if they are ObjectTypes without fields.
- Rename GQC methods:
  - `typeComposer` to `get`
  - `setType` to `add`
  - `hasType` to `has`

## 0.0.8 (July 18, 2016)
* Add export of `getProjectionFromAST` function to module
* Fix peerDependencies
* Update flow-bin till 0.29
* Fix `undefined` postfix for generated InputTypes

## 0.0.6 (July 15, 2016)
* feat: derive projection for resolverParams from fieldASTs
* fix: clone for Types

## 0.0.5 (July 08, 2016)
* ResolverMiddlewares now have access to wrapped resolver

## 0.0.4 (July 07, 2016)
* TypeComposer can manipulate the object type interfaces  
* add ability to clone types
* exports flow annotations
* some internal improvements

## 0.0.3 (July 03, 2016)
* Published for playing and testing `graphql-compose-mongoose`
* fix call resolver function with proper arguments

## 0.0.2 (July 01, 2016)
* Published for playing and testing `graphql-compose-mongoose`

## 0.0.1 (June 07, 2016)
* Initial commit with proposal
