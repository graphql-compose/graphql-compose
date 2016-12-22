## 06 - Generating schema

`schema.js`
```js
import { GQC } from 'graphql-compose';

import './rootQuery';
import './rootMutation';

export default GQC.buildSchema();
```

`rootQuery.js`
```js
import { GQC } from 'graphql-compose';
import { ViewerTC } from './viewer';
import { AdminTC } from './admin';


GQC.rootQuery().addFields({
  viewer: ViewerTC.get('$load'),
  admin: AdminTC.get('$onlyForAdmins'),
});

// expose `context` into schema
[ViewerTC, AdminTC].forEach((TC) => {
  TC.addFields({
    contextData: {
      type: 'JSON',
      description: 'Context data of current client',
      resolve: (source, args, context) => context,
    },
  });
});
```

`viewer.js`
```js
import { GQC } from 'graphql-compose';
import { UserTC } from './user';
import { CompanyTC } from './company';

export const ViewerTC = GQC.get('Viewer');

ViewerTC.addResolver({
  name: 'load',
  type: ViewerTC,
  resolve: () => ({}),
});

ViewerTC.addFields({
  user: UserTC.get('$findById'),
  userConnection: UserTC.get('$connection'),
  company: CompanyTC.get('$findById'),
  companyConnection: CompanyTC.get('$connection'),
});
```

`admin.js`
```js
import { GQC } from 'graphql-compose';
import { TransactionTC } from './transaction';

export const AdminTC = GQC.get('ADM');

AdminTC.addResolver({
  name: 'onlyForAdmins',
  outputType: AdminTC,
  description: 'Data under Admin',
  resolve: ({ context }) => {
    if (!context.admin) {
      throw new Error('You should be admin, to have access to this area.');
    }
    return {};
  },
});

AdminTC.addFields({
  transaction: TransactionTC.getResolver('findById'),
  transactionConnection: TransactionTC.getResolver('connection'),
});
```

`rootMutation.js`
```js
import { GQC } from 'graphql-compose';

import { CommentTC } from './comment';
import { UserTC } from './user';

export const RootMutationTC = GQC.rootMutation();

RootMutationTC.addFields({
  commentCreate: CommentTC.get('$createOne'),  // may anybody

  ...adminAccess({ // only for admins
    userCreate: UserTC.get('$createOne'),
    userUpdate: UserTC.get('$updateById'),
    userRemove: UserTC.get('$removeById'),
  }),
});

function adminAccess(resolvers) {
  Object.keys(resolvers).forEach((k) => {
    resolvers[k] = resolvers[k].wrapResolve(next => (rp) => {
      if (!rp.context.isAdmin) {
        throw new Error('You should be admin, to have access to this action.');
      }
      return next(rp);
    });
  });
  return resolvers;
}
```
