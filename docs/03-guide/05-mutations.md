## 05 - Mutations
Lets get into the CUD in the CRUD..
Well `graphql-composer` ships with resolvers for create, update and remove. Could it be more simple? :)

Looking like this:
```js
UserTC.getResolver('createOne').getFieldConfig()
UserTC.getResolver('update').getFieldConfig()
UserTC.getResolver('remove').getFieldConfig()
```


Lets add a working example from the preview `UserTC` we have created

`schema.js`
```js
import { GQC } from 'graphql-compose';
import { UserTC } from './user.js';

GQC.rootQuery().addFields({
  ...
});

GQC.rootMutation().addFields({
  userCreate: UserTC.get('$createOne'),
  userUpdateById: UserTC.get('$updateById'),
  userUpdateOne: UserTC.get('$updateOne'),
  userUpdateMany: UserTC.get('$updateMany'),

  // let add restriction for remove operations
  ...adminAccess({
    userRemoveById: UserTC.get('$removeById'),
    userRemoveOne: UserTC.get('$removeOne'),
    userRemoveMany: UserTC.get('$removeMany'),
  }),
});

function adminAccess(resolvers) {
  Object.keys(resolvers).forEach((k) => {
    resolvers[k] = resolvers[k].wrapResolve(next => (rp) => {
      // rp = resolveParams = { source, args, context, info }
      if (!rp.context.isAdmin) {
        throw new Error('You should be admin, to have access to this action.');
      }
      return next(rp);
    });
  });
  return resolvers;
}

export default GQC.buildSchema();
```


### Custom mutations
`user.js`
```js

UserTC.addResolver({
  name: 'myCustomUpdate',
  kind: 'mutation',
  args: {
    id: 'String',
    firstName: 'String',
    lastName: 'String',
  },
  type: UserTC,
  resolve: (_, args, context, info) => {
    //edit and do what you need..
    return user;
  }
});

// so now you may add you custom mutation to schema
GQC.rootMutation().addFields({
  customUserUpdate: UserTC.get('$myCustomUpdate'),
});
```
