/* @flow */

import { TypeComposer, schemaComposer } from '../';

beforeEach(() => {
  schemaComposer.clear();
});

describe('created types via TypeComposer.create should be avaliable in SDL', () => {
  it('simple case', () => {
    const UserTC = TypeComposer.create(`
      type User {
        name: String
      }
    `);

    const ArticleTC = TypeComposer.create(`
      type Article {
        text: String
        user: User
      }
    `);

    expect(ArticleTC.getFieldType('user')).toBe(UserTC.getType());
  });

  it('hoisting case', () => {
    const UserTC = TypeComposer.create({
      name: 'User',
      fields: {
        name: 'String',
        articles: '[Article]',
      },
    });

    const ArticleTC = TypeComposer.create({
      name: 'Article',
      fields: {
        text: 'String',
        user: 'User',
      },
    });

    expect(ArticleTC.getFieldType('user')).toBe(UserTC.getType());
    const ArticleList: any = UserTC.getFieldType('articles');
    expect(ArticleList.ofType).toBe(ArticleTC.getType());
  });
});
