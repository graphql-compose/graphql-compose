##05 - Mutations 
Lets get into the CUD in the CRUD..
Well graphql-composer ships with resolvers for create, update and remove. Could it be more simple? :)

Looking like this:
```js
UsersTC.getResolver('createOne').getFieldConfig()
UsersTC.getResolver('update').getFieldConfig()
UsersTC.getResolver('remove').getFieldConfig()
```


Lets add a working example from the preview `UsersTC` we have created

`mutations.js`
```js
export const mutations = new GraphQLSchema({
  query: rootTypeTC.getType(),
  mutation: new GraphQLObjectType({
    name: 'RootMutation',
    fields: {
      userCreate: resolvers.get('createOne').getFieldConfig(),
      userUpdateById: resolvers.get('updateById').getFieldConfig(),
      userUpdateOne: resolvers.get('updateOne').getFieldConfig(),
      userUpdateMany: resolvers.get('updateMany').getFieldConfig(),
      userRemoveById: resolvers.get('removeById').getFieldConfig(),
      userRemoveOne: resolvers.get('removeOne').getFieldConfig(),
      userRemoveMany: resolvers.get('removeMany').getFieldConfig(),
    },
  }),
});

export default graphqlSchema;
```


###Custom mutations
`UserMutation.js`
```js
import {
  GraphQLString
} from 'graphql'

import {UsersTC, User} from '../models'
import {mutationWithClientMutationId} from 'graphql-relay'

export default mutationWithClientMutationId({
  name: 'UserUpdate',
  inputFields: {
    id: { type: GraphQLString},
    firstName: { type: GraphQLString},
    lastName: { type: GraphQLString},
  },
  outputFields: {
    user: {
      type: UsersTC.getType(),
      resolve: user => user
    }
  },
  mutateAndGetPayload: (input, context, info) => {
    //edit and do what you need..
    return user
  }
})
```

`schema.js` 
```js
import UserMutation from './UserMutation'

export const mutations = new GraphQLSchema({
  query: rootTypeTC.getType(),
  mutation: new GraphQLObjectType({
    name: 'RootMutation',
    fields: {
      userUpdate: UserMutation,
    },
  }),
});

export default graphqlSchema;
```