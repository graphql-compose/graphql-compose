/* @flow */

import {
  getComposeTypeName,
  isTypeNameString,
  isTypeDefinitionString,
  isOutputTypeDefinitionString,
  isInputTypeDefinitionString,
  isEnumTypeDefinitionString,
  isScalarTypeDefinitionString,
  isInterfaceTypeDefinitionString,
  isUnionTypeDefinitionString,
} from '../typeHelpers';
import { GraphQLObjectType, GraphQLInputObjectType } from '../../graphql';
import { schemaComposer as sc } from '../..';

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
      expect(getComposeTypeName(sc.createObjectTC('TypeTC'))).toBe('TypeTC');
      expect(getComposeTypeName(sc.createInputTC('TypeITC'))).toBe('TypeITC');
    });
  });

  it('check SDL types', () => {
    const output = 'type Out { name: String! }';
    const input = 'input Filter { minAge: Int }';
    const enumType = 'enum Sort { ASC DESC }';
    const scalar = 'scalar UInt';
    const iface = 'interface User { name: String }';
    const union = 'union U = A | B';

    expect(isTypeDefinitionString(output)).toBeTruthy();
    expect(isOutputTypeDefinitionString(output)).toBeTruthy();
    expect(isOutputTypeDefinitionString(input)).toBeFalsy();

    expect(isTypeDefinitionString(input)).toBeTruthy();
    expect(isInputTypeDefinitionString(input)).toBeTruthy();
    expect(isInputTypeDefinitionString(output)).toBeFalsy();

    expect(isTypeDefinitionString(enumType)).toBeTruthy();
    expect(isEnumTypeDefinitionString(enumType)).toBeTruthy();
    expect(isEnumTypeDefinitionString(output)).toBeFalsy();

    expect(isTypeDefinitionString(scalar)).toBeTruthy();
    expect(isScalarTypeDefinitionString(scalar)).toBeTruthy();
    expect(isScalarTypeDefinitionString(output)).toBeFalsy();

    expect(isTypeDefinitionString(iface)).toBeTruthy();
    expect(isInterfaceTypeDefinitionString(iface)).toBeTruthy();
    expect(isInterfaceTypeDefinitionString(output)).toBeFalsy();

    expect(isTypeDefinitionString(union)).toBeTruthy();
    expect(isUnionTypeDefinitionString(union)).toBeTruthy();
    expect(isUnionTypeDefinitionString(output)).toBeFalsy();
  });

  it('check type name', () => {
    expect(isTypeNameString('aaaa')).toBeTruthy();
    expect(isTypeNameString('Aaaaa')).toBeTruthy();
    expect(isTypeNameString('A_')).toBeTruthy();
    expect(isTypeNameString('_A')).toBeTruthy();
    expect(isTypeNameString('A_123')).toBeTruthy();
    expect(isTypeNameString('123')).toBeFalsy();
    expect(isTypeNameString('A-')).toBeFalsy();
  });
});
