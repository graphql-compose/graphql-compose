import { expect } from 'chai';
import {
  GraphQLInputObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLBoolean,
} from 'graphql';
import InputTypeComposer from '../inputTypeComposer';


describe('InputTypeComposer', () => {
  let objectType;

  beforeEach(() => {
    objectType = new GraphQLInputObjectType({
      name: 'InputType',
      fields: {
        input1: { type: GraphQLString },
        input2: { type: GraphQLString },
      },
    });
  });


  it('should has `getFields` method', () => {
    const tc = new InputTypeComposer(objectType);
    const fieldNames = Object.keys(tc.getFields());
    expect(fieldNames).to.have.members(['input1', 'input2']);
  });


  it('should has `addFields` method', () => {
    const tc = new InputTypeComposer(objectType);
    tc.addField('input3', { type: GraphQLString });
    const fieldNames = Object.keys(objectType.getFields());
    expect(fieldNames).to.include('input3');
  });


  it('should add fields with converting types from string to object', () => {
    const tc = new InputTypeComposer(objectType);
    tc.addField('input3', { type: 'String' });
    tc.addFields({
      input4: { type: '[Int]' },
      input5: { type: 'Boolean!' },
    });

    expect(tc.getField('input3').type).to.equal(GraphQLString);
    expect(tc.getField('input4').type).instanceof(GraphQLList);
    expect(tc.getField('input4').type.ofType).to.equal(GraphQLInt);
    expect(tc.getField('input5').type).instanceof(GraphQLNonNull);
    expect(tc.getField('input5').type.ofType).to.equal(GraphQLBoolean);
  });
});
