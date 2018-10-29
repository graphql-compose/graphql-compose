/* @flow strict */

// copied from https://github.com/taion/graphql-type-json

import { Kind } from '../../graphql';

import GraphQLDate from '../date';

describe('GraphQLDate', () => {
  describe('serialize', () => {
    it('pass Date object', () => {
      expect(GraphQLDate.serialize(new Date(Date.UTC(2017, 10, 19)))).toBe(
        '2017-11-19T00:00:00.000Z'
      );
    });

    it('pass number', () => {
      expect(GraphQLDate.serialize(new Date(Date.UTC(2018, 10, 1)).getTime())).toBe(
        '2018-11-01T00:00:00.000Z'
      );
    });

    it('pass "2016-02-02T00:13:22.000Z"', () => {
      expect(GraphQLDate.serialize('2016-02-02T00:13:22.000Z')).toBe('2016-02-02T00:13:22.000Z');
    });

    it('pass "2016-02-02T00:13:22Z"', () => {
      expect(GraphQLDate.serialize('2016-02-02T00:13:22Z')).toBe('2016-02-02T00:13:22Z');
    });

    it('pass "2016-02-02"', () => {
      expect(GraphQLDate.serialize('2016-02-02')).toBe('2016-02-02');
    });
  });

  describe('parseValue', () => {
    it('support parsing values', () => {
      expect(GraphQLDate.parseValue('2017-11-18T00:00:00.000Z')).toEqual(
        new Date(Date.UTC(2017, 10, 18, 0, 0, 0))
      );
    });
  });

  describe('parseLiteral', () => {
    it('parse a ast literal', async () => {
      const ast = {
        kind: Kind.STRING,
        value: '2015-07-24T10:56:42.744Z',
      };
      const date: any = GraphQLDate.parseLiteral(ast);
      expect(date).toBeInstanceOf(Date);
      expect(date.toJSON()).toEqual(ast.value);
    });
  });
});
