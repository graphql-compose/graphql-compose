import { expect } from 'chai';
import {
  GraphQLString,
  GraphQLFloat,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLID,
  GraphQLObjectType,
  GraphQLList,
  GraphQLNonNull,
} from 'graphql';
import GQC from '../gqc';
import typeMapper from '../typeMapper';
import TypeComposer from '../typeComposer';


describe('TypeMapper', () => {
  it('should have basic mapper functions', () => {
    typeMapper.set('test', GraphQLString);
    expect(typeMapper.has('test')).to.be.true;
    expect(typeMapper.get('test')).to.be.equal(GraphQLString);
    expect(Array.from(typeMapper.keys())).to.include('test');
    typeMapper.delete('test');
    expect(typeMapper.has('test')).to.be.false;
  });


  it('should add basic scalar GraphQL types', () => {
    expect(typeMapper.get('String')).to.be.equal(GraphQLString);
    expect(typeMapper.get('Float')).to.be.equal(GraphQLFloat);
    expect(typeMapper.get('Int')).to.be.equal(GraphQLInt);
    expect(typeMapper.get('Boolean')).to.be.equal(GraphQLBoolean);
    expect(typeMapper.get('ID')).to.be.equal(GraphQLID);

    expect(Array.from(typeMapper.keys())).to.include.members(
      ['String', 'Float', 'Int', 'Boolean', 'ID']
    );
  });


  it('should create object type from template string', () => {
    const type = typeMapper.createType(`
      type IntRange {
        # Max value
        max: Int,
        # Min value
        min: Int!
        # Array of Strings
        arr: [String]
      }
    `);

    expect(type).instanceof(GraphQLObjectType);
    expect(typeMapper.get('IntRange')).to.equal(type);

    const IntRangeTC = new TypeComposer(type);
    expect(IntRangeTC.getTypeName()).to.equal('IntRange');
    expect(IntRangeTC.getFieldNames()).to.include.members([ 'max', 'min', 'arr' ]);
    expect(IntRangeTC.getField('max').description).to.equal('Max value');
    expect(IntRangeTC.getField('max').type).to.equal(GraphQLInt);
    expect(IntRangeTC.getField('min').type).instanceof(GraphQLNonNull);
    expect(IntRangeTC.getField('arr').type).instanceof(GraphQLList);
  });


  it('should return wrapped type', () => {
    expect(typeMapper.getWrapped('String!')).instanceof(GraphQLNonNull);
    expect(typeMapper.getWrapped('[String]')).instanceof(GraphQLList);

    expect(typeMapper.getWrapped('[String]!')).instanceof(GraphQLNonNull);
    expect(typeMapper.getWrapped('[String]!').ofType).instanceof(GraphQLList);

    expect(typeMapper.getWrapped('String')).equal(GraphQLString);
  });
});
