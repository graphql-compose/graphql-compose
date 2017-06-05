import { expect } from 'chai';
import {
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLInt,
} from 'graphql';
import TypeComposer from '../typeComposer';
import InputTypeComposer from '../inputTypeComposer';
import { toInputObjectType } from '../toInputObjectType';

describe('toInputObjectType()', () => {
  let PersonType;
  let PersonTC;

  beforeEach(() => {
    PersonType = new GraphQLObjectType({
      name: 'Person',
      fields: () => ({
        name: { type: GraphQLString },
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
      }),
    });
    PersonTC = TypeComposer.create(PersonType);
  });

  it('should return InputTypeComposer', () => {
    const itc = toInputObjectType(PersonTC);
    expect(itc).instanceof(InputTypeComposer);
    expect(itc.getTypeName()).to.equal('PersonInput');
  });

  it('should accept prefix in opts', () => {
    const itc = toInputObjectType(PersonTC, { prefix: 'SomePrefix' });
    expect(itc.getTypeName()).to.equal('SomePrefixPersonInput');
  });

  it('should accept postfix in opts', () => {
    const itc = toInputObjectType(PersonTC, { postfix: 'PostfixInpt' });
    expect(itc.getTypeName()).to.equal('PersonPostfixInpt');
  });

  it('should keep scalar types', () => {
    const itc = toInputObjectType(PersonTC);
    expect(itc.getFieldType('name')).to.equal(GraphQLString);
    expect(itc.getFieldType('age')).to.equal(GraphQLInt);
  });

  it('should convert field with ObjectType to InputType', () => {
    const itc = toInputObjectType(PersonTC);
    const addrType = itc.getFieldType('address');
    expect(addrType).instanceof(GraphQLInputObjectType);
    expect(addrType._typeConfig.name).to.equal('PersonAddressInput');
  });

  it('should reuse generated input type for recursive types', () => {
    PersonTC.setField('spouce', { type: PersonType });
    const itc = toInputObjectType(PersonTC);
    expect(itc.getFieldType('spouce')).to.equal(itc.getType());
  });

  it('should reuse generated input type for recursive types in List', () => {
    PersonTC.setField('friends', { type: new GraphQLList(PersonType) });
    const itc = toInputObjectType(PersonTC);
    expect(itc.getFieldType('friends').ofType).to.equal(itc.getType());
  });
});
