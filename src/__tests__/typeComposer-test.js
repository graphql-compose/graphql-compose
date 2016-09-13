import { expect } from 'chai';
import {
  GraphQLObjectType,
  GraphQLString,
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
