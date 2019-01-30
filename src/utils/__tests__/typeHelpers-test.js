/* @flow */

import { getComposeTypeName } from '../typeHelpers';
import { GraphQLObjectType, GraphQLInputObjectType } from '../../graphql';
import { schemaComposer } from '../..';

describe('typeHelpers', () => {
  describe('getComposeTypeName()', () => {
    it('understand strings', () => {
      expect(getComposeTypeName('MyTypeName')).toBe('MyTypeName');
      expect(getComposeTypeName('type AAA { f: Int }')).toBe('AAA');
    });

    it('understands GraphQL named types', () => {
      expect(
        getComposeTypeName(
          new GraphQLObjectType({
            name: 'OutputType',
            fields: () => ({}),
          })
        )
      ).toBe('OutputType');

      expect(
        getComposeTypeName(
          new GraphQLInputObjectType({
            name: 'InputType',
            fields: () => ({}),
          })
        )
      ).toBe('InputType');
    });

    it('understands compose types', () => {
      expect(getComposeTypeName(schemaComposer.TypeComposer.create('TypeTC'))).toBe('TypeTC');
      expect(getComposeTypeName(schemaComposer.InputTypeComposer.create('TypeITC'))).toBe(
        'TypeITC'
      );
    });
  });
});
