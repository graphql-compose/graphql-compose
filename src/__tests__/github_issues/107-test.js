/* @flow strict */

import {
  GraphQLSchema,
  GraphQLString,
  GraphQLObjectType,
  GraphQLInt,
  GraphQLList,
  graphql,
} from 'graphql';
import { TypeComposer, GQC } from '../../';

const remoteSchema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      users: {
        type: new GraphQLList(
          new GraphQLObjectType({
            name: 'User',
            fields: {
              name: { type: GraphQLString },
              age: { type: GraphQLInt },
              access: {
                type: new GraphQLObjectType({
                  name: 'Access',
                  fields: {
                    msg: { type: GraphQLString },
                  },
                }),
                resolve: source => ({
                  msg: source.age >= 20 ? `allowed` : 'disallowed',
                }),
              },
            },
          })
        ),
        resolve: () => [{ name: 'u1', age: 10 }, { name: 'u2', age: 20 }, { name: 'u3', age: 30 }],
      },
    },
  }),
});

beforeEach(() => {
  GQC.clear();
});

describe('github issue #107 merge Schema types on GQL', () => {
  it('get QueryTC from remote schema', () => {
    const RemoteQueryType: any = remoteSchema._queryType;
    const RemoteQueryTC = TypeComposer.create(RemoteQueryType);
    expect(RemoteQueryTC).toBeInstanceOf(TypeComposer);
    expect(RemoteQueryTC.getTypeName()).toBe('Query');
    expect(RemoteQueryTC.getFieldNames()).toEqual(['users']);

    // remoteMutationTC = TypeComposer.create(remoteSchema._mutationType);
    // remoteSubscriptionTC = TypeComposer.create(remoteSchema._subscriptionType);
  });

  it('get nested TC from remote schema', () => {
    const RemoteQueryType: any = remoteSchema._queryType;
    const RemoteQueryTC = TypeComposer.create(RemoteQueryType);
    const RemoteUserTC = RemoteQueryTC.get('users');
    expect(RemoteUserTC.getTypeName()).toEqual('User');

    const RemoteAccessTC = RemoteQueryTC.get('users.access');
    expect(RemoteAccessTC.getTypeName()).toEqual('Access');
  });

  it('schema stiching on Query', async () => {
    const RemoteQueryType: any = remoteSchema._queryType;
    const RemoteQueryTC = TypeComposer.create(RemoteQueryType);

    GQC.rootQuery().addFields({
      tag: {
        type: TypeComposer.create(`type Tag { id: Int, title: String}`),
        resolve: () => ({ id: 1, title: 'Some tag' }),
      },
      ...RemoteQueryTC.getFields(),
    });

    expect(GQC.rootQuery().getFieldNames()).toEqual(['tag', 'users']);

    const schema = GQC.buildSchema();
    expect(
      await graphql(
        schema,
        `
          query {
            tag {
              id
              title
            }
            users {
              age
            }
          }
        `
      )
    ).toEqual({
      data: { tag: { id: 1, title: 'Some tag' }, users: [{ age: 10 }, { age: 20 }, { age: 30 }] },
    });
  });

  it('schema stiching on Query.remote', async () => {
    const RemoteQueryType: any = remoteSchema._queryType;
    const RemoteQueryTC = TypeComposer.create(RemoteQueryType);

    GQC.rootQuery().addFields({
      tag: {
        type: TypeComposer.create(`type Tag { id: Int, title: String}`),
        resolve: () => ({ id: 1, title: 'Some tag' }),
      },
      remote: {
        type: TypeComposer.create({
          name: 'RemoteSchema',
          fields: RemoteQueryTC.getFields(),
        }),
        resolve: () => ({}), // it's important to return something (not null/undefined)
      },
    });

    expect(GQC.rootQuery().getFieldNames()).toEqual(['tag', 'remote']);

    const schema = GQC.buildSchema();
    expect(
      await graphql(
        schema,
        `
          query {
            tag {
              id
              title
            }
            remote {
              users {
                age
              }
            }
          }
        `
      )
    ).toEqual({
      data: {
        tag: { id: 1, title: 'Some tag' },
        remote: { users: [{ age: 10 }, { age: 20 }, { age: 30 }] },
      },
    });
  });

  it('using remote type in local schema', async () => {
    const RemoteQueryType: any = remoteSchema._queryType;
    const RemoteQueryTC = TypeComposer.create(RemoteQueryType);
    const RemoteUserTC = RemoteQueryTC.getFieldTC('users');
    const remoteUsersFC = RemoteQueryTC.getFieldConfig('users');

    const LocalArticleTC = TypeComposer.create({
      name: 'Article',
      fields: {
        text: {
          type: 'String',
        },
        author: {
          type: RemoteUserTC,
          args: { ...remoteUsersFC.args },
          resolve: (source, args, context, info) => {
            if (!remoteUsersFC.resolve) return null;
            const users: any = remoteUsersFC.resolve(source, args, context, info);
            // for simplicity return first user
            return users[0];
          },
        },
      },
    });

    GQC.rootQuery().addFields({
      article: {
        type: LocalArticleTC,
        resolve: () => ({ text: 'Article 1' }),
      },
    });

    const schema = GQC.buildSchema();
    expect(
      await graphql(
        schema,
        `
          query {
            article {
              text
              author {
                name
                age
                access {
                  msg
                }
              }
            }
          }
        `
      )
    ).toEqual({
      data: {
        article: {
          text: 'Article 1',
          author: { access: { msg: 'disallowed' }, age: 10, name: 'u1' },
        },
      },
    });
  });

  it('adding remote type to GQC and check reference by name', () => {
    const RemoteQueryType: any = remoteSchema._queryType;
    const RemoteQueryTC = TypeComposer.create(RemoteQueryType);
    const UserTC = RemoteQueryTC.getFieldTC('users');
    GQC.add(UserTC);

    const ArticleTC = TypeComposer.create({
      name: 'Article',
      fields: {
        user: 'User',
        users: ['User'],
      },
    });

    const userType: any = ArticleTC.getFieldType('user');
    expect(userType).toBeInstanceOf(GraphQLObjectType);
    expect(userType.name).toBe('User');

    const usersType: any = ArticleTC.getFieldType('users');
    expect(usersType).toBeInstanceOf(GraphQLList);
    expect(usersType.ofType.name).toBe('User');
  });
});
