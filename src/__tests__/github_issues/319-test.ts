// TODO: enable after migration to TypeScript

import { SchemaComposer } from '../..';

describe.skip('github issue #319: Memoize type.getFields in ObjectTypeComposer.js', () => {
  it('should build schema successfully', async () => {
    const sc = new SchemaComposer(`
      type User {
        name: String
        friends: User
      }

      type Article {
        title: String
        text: String
        author: User
        comments: [Comment]
      }

      type Comment {
        text: String
        author: User
        replies: [Comment]
      }

      type Query {
        users: [User]
        articles: [Article]
        comments: [Comment]
      }
    `);

    const schema = sc.buildSchema();
    console.log(schema);
  });
});
