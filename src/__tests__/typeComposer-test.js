import { expect } from 'chai';
import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
} from 'graphql';
import GQC from '../gqc';
import TypeComposer from '../typeComposer';


describe('TypeComposer', () => {
  let objectType;

  beforeEach(() => {
    objectType = new GraphQLObjectType({
      name: 'Readable',
      fields: {
        field1: { type: GraphQLString },
        field2: { type: GraphQLString },
      },
    });
  });


  it('should has `getFields` method', () => {
    const tc = new TypeComposer(objectType);
    const fieldNames = Object.keys(tc.getFields());
    expect(fieldNames).to.have.members(['field1', 'field2']);
  });


  it('should has `addFields` method', () => {
    const tc = new TypeComposer(objectType);
    tc.addField('field3', { type: GraphQLString });
    const fieldNames = Object.keys(objectType.getFields());
    expect(fieldNames).to.include('field3');
  });


  it('should add fields with converting types from string to object', () => {
    const tc = new TypeComposer(objectType);
    tc.addField('field3', { type: 'String' });
    tc.addFields({
      field4: { type: '[Int]' },
      field5: { type: 'Boolean!' },
    });

    expect(tc.getField('field3').type).to.equal(GraphQLString);
    expect(tc.getField('field4').type).instanceof(GraphQLList);
    expect(tc.getField('field4').type.ofType).to.equal(GraphQLInt);
    expect(tc.getField('field5').type).instanceof(GraphQLNonNull);
    expect(tc.getField('field5').type.ofType).to.equal(GraphQLBoolean);
  });


  it('should add fields with converting args types from string to object', () => {
    const tc = new TypeComposer(objectType);
    tc.addField('field3', {
      type: 'String',
      args: {
        arg1: { type: 'String!' },
        arg2: { type: '[Float]' },
      },
    });

    expect(tc.getFieldArg('field3', 'arg1').type).instanceof(GraphQLNonNull);
    expect(tc.getFieldArg('field3', 'arg1').type.ofType).to.equal(GraphQLString);
    expect(tc.getFieldArg('field3', 'arg2').type).instanceof(GraphQLList);
    expect(tc.getFieldArg('field3', 'arg2').type.ofType).to.equal(GraphQLFloat);
  });


  it('should add projection via addField and addFields', () => {
    const tc = new TypeComposer(objectType);
    tc.addField('field3', {
      type: GraphQLString,
      projection: { field1: true, field2: true },
    });
    tc.addFields({
      field4: { type: GraphQLString },
      field5: { type: GraphQLString, projection: { field4: true } },
    });

    expect(tc.getProjectionMapper()).to.deep.equal({
      field3: { field1: true, field2: true },
      field5: { field4: true },
    })
  });


  it('should clone projection for fields', () => {
    const tc = new TypeComposer(objectType);
    tc.addField('field3', {
      type: GraphQLString,
      projection: { field1: true, field2: true },
    });

    const tc2 = tc.clone('newObject');
    expect(tc2.getProjectionMapper()).to.deep.equal({
      field3: { field1: true, field2: true },
    })
  });
});
