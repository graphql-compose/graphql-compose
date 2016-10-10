/* eslint-disable no-new */

import { expect } from 'chai';
import {
  graphql,
  GraphQLString,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
} from 'graphql';
import GQC from '../__mocks__/gqc';
import Resolver from '../resolver';
import TypeComposer from '../typeComposer';
import InputTypeComposer from '../inputTypeComposer';


describe('Resolver', () => {
  let someTC;
  let resolver;

  beforeEach(() => {
    someTC = TypeComposer.create('ValidType');
    resolver = new Resolver({ name: 'find' });
  });


  it('should throw error if not passed name in opts', () => {
    expect(() => { new Resolver({}); }).to.throw();
  });


  it('should have setArg and getArg methods', () => {
    resolver.setArg('a1', { type: GraphQLString });
    expect(resolver.getArg('a1').type).equal(GraphQLString);

    resolver.setArg('a2', { type: 'String' });
    expect(resolver.getArg('a2').type).equal(GraphQLString);

    resolver.setArg('a3', 'String');
    expect(resolver.getArg('a3').type).equal(GraphQLString);
  });


  it('should remove args and return undefined for non-existing arg', () => {
    const argName = 'argField';
    const argConfig = { type: GraphQLString };
    resolver.setArg(argName, argConfig);
    resolver.removeArg(argName);
    expect(resolver.getArg(argName)).to.be.undefined;
  });


  it('should convert type as string to GraphQLType in outputType', () => {
    const resolver = new Resolver({
      name: 'customResolver',
      outputType: `String!`,
    });
    expect(resolver.outputType).instanceof(GraphQLNonNull);
    expect(resolver.outputType.ofType).equal(GraphQLString);
  });


  it('should convert type definition to GraphQLType in outputType', () => {
    const resolver = new Resolver({
      name: 'customResolver',
      outputType: `
        type SomeType {
          name: String
        }
      `,
    });
    expect(resolver.outputType).instanceof(GraphQLObjectType);
    expect(resolver.outputType.name).equal('SomeType');
  });


  it('should return data from resolve', async () => {
    const resolver = new Resolver({
      name: 'customResolver',
      resolve: () => ({ name: 'Nodkz' }),
      outputType: `
        type SomeType {
          name: String
        }
      `,
    });

    GQC.rootQuery().addRelation('resolveUser', () => ({
      resolver: resolver,
      args: {},
      projection: { _id: true },
    }));

    const schema = GQC.buildSchema();
    const result = await graphql(schema, '{ resolveUser { name } }');
    expect(
      result
    ).to.deep.equal({
      data: {
        resolveUser: {
          name: 'Nodkz',
        },
      },
    });
  });


  describe('addFilterArg', () => {
    it('should add arg to filter and setup default value', () => {
      const newResolver = resolver.addFilterArg({
        name: 'age',
        type: 'Int!',
        defaultValue: 20,
        description: 'Age filter',
        filterTypeNameFallback: 'FilterUniqueNameInput',
      });

      expect(resolver.getArg('filter')).to.be.not.ok;

      const filterCfg = newResolver.getArg('filter');
      expect(filterCfg).to.be.ok;
      expect(filterCfg.type).instanceof(GraphQLInputObjectType);
      expect(filterCfg.defaultValue).deep.equal({ age: 20 });

      const filterITC = new InputTypeComposer(filterCfg.type);
      expect(filterITC.getField('age').description).equal('Age filter');
      expect(filterITC.getFieldType('age')).instanceof(GraphQLNonNull);
      expect(filterITC.getFieldType('age').ofType).equal(GraphQLInt);
    });

    it('should prepare resolveParams.rawQuery when `resolve` called', () => {
      let rpSnap;
      const resolve = resolver.resolve;
      resolver.resolve = (rp) => {
        rpSnap = rp;
        return resolve(rp);
      };

      const newResolver = resolver.addFilterArg({
        name: 'age',
        type: 'Int!',
        description: 'Age filter',
        query: (query, value, resolveParams) => {
          query.age = { $gt: value }; // eslint-disable-line no-param-reassign
          query.someKey = resolveParams.someKey; // eslint-disable-line no-param-reassign
        },
        filterTypeNameFallback: 'FilterUniqueNameInput',
      });

      newResolver.resolve({ args: { filter: { age: 15 } }, someKey: 16 });

      expect(rpSnap).property('rawQuery').deep.equal({ age: { $gt: 15 }, someKey: 16 });
    });
  });

  it('should return nested name for Resolver', () => {
    const r1 = new Resolver({ name: 'find' });
    const r2 = r1.wrapResolve((next) => (resolveParams) => {
      return 'function code';
    });

    expect(r1.getNestedName()).equal('find');
    expect(r2.getNestedName()).equal('wrapResolve(find)');
  });

  it('should on toString() call provide debug info with source code', () => {
    const r1 = new Resolver({ name: 'find' });
    const r2 = r1.wrapResolve((next) => (resolveParams) => {
      return 'function code';
    });

    expect(r2.toString()).to.have.string('function code');
  });
});
