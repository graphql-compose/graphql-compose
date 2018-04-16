/* @flow strict */

import {
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLInt,
} from '../../graphql';
import { TypeComposer, InputTypeComposer } from '../../';
import { toInputObjectType } from '../toInputObjectType';

describe('toInputObjectType()', () => {
  let PersonTC: TypeComposer;

  beforeEach(() => {
    PersonTC = TypeComposer.create({
      name: 'Person',
      fields: {
        name: 'String',
        age: { type: GraphQLInt },
        address: {
          type: new GraphQLObjectType({
            name: 'Address',
            fields: {
              city: { type: GraphQLString },
              street: { type: GraphQLString },
            },
          }),
        },
      },
    });
  });

  it('should return InputTypeComposer', () => {
    const itc = toInputObjectType(PersonTC);
    expect(itc).toBeInstanceOf(InputTypeComposer);
    expect(itc.getTypeName()).toBe('PersonInput');
  });

  it('should accept prefix in opts', () => {
    const itc = toInputObjectType(PersonTC, { prefix: 'SomePrefix' });
    expect(itc.getTypeName()).toBe('SomePrefixPersonInput');
  });

  it('should accept postfix in opts', () => {
    const itc = toInputObjectType(PersonTC, { postfix: 'PostfixInpt' });
    expect(itc.getTypeName()).toBe('PersonPostfixInpt');
  });

  it('should keep scalar types', () => {
    const itc = toInputObjectType(PersonTC);
    expect(itc.getFieldType('name')).toBe(GraphQLString);
    expect(itc.getFieldType('age')).toBe(GraphQLInt);
  });

  it('should convert field with ObjectType to InputType', () => {
    const itc = toInputObjectType(PersonTC);
    const addrType = itc.getFieldType('address');
    expect(addrType).toBeInstanceOf(GraphQLInputObjectType);
    expect((addrType: any)._typeConfig.name).toBe('PersonAddressInput');
  });

  it('should reuse generated input type for recursive types', () => {
    PersonTC.setField('spouce', PersonTC);
    const itc = toInputObjectType(PersonTC);
    expect(itc.getFieldType('spouce')).toBe(itc.getType());
  });

  it('should reuse generated input type for recursive types in List', () => {
    PersonTC.setField('friends', PersonTC.getTypePlural());
    const itc = toInputObjectType(PersonTC);
    expect(itc.getFieldType('friends')).toBeInstanceOf(GraphQLList);
    expect((itc.getFieldType('friends'): any).ofType).toBe(itc.getType());
  });
});
