/* eslint-disable no-new */

import { expect } from 'chai';
import {
  graphql,
  GraphQLString,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLNonNull,
} from 'graphql';
import GQC from '../../__mocks__/gqc';
import ResolverMiddleware from '../resolverMiddleware';
import Resolver from '../resolver';
import TypeComposer from '../../typeComposer';
import InputTypeComposer from '../../inputTypeComposer';


describe('Resolver', () => {
  let someTC;
  let resolver;

  beforeEach(() => {
    someTC = TypeComposer.create('ValidType');
    resolver = new Resolver(someTC, { name: 'find' });
  });


  it('should throw error if not passed TypeComposer', () => {
    expect(() => { new Resolver(); }).to.throw();
  });


  it('should throw error if not passed name in opts', () => {
    expect(() => { new Resolver(someTC); }).to.throw();
  });


  it('should have setArg and getArg methods', () => {
    const argName = 'argField';
    const argConfig = { type: GraphQLString };
    resolver.setArg(argName, argConfig);
    expect(resolver.getArg(argName)).to.equal(argConfig);
  });


  it('should remove args and return undefined for non-existing arg', () => {
    const argName = 'argField';
    const argConfig = { type: GraphQLString };
    resolver.setArg(argName, argConfig);
    resolver.removeArg(argName);
    expect(resolver.getArg(argName)).to.be.undefined;
  });


  it('should return data from resolve', async () => {
    const resolvedName = 'nameFromResolve';
    const UserTC = GQC.get('User');
    const resolver1 = new Resolver(UserTC, {
      name: 'customResolver',
      resolve: () => ({ name: resolvedName }),
      outputType: UserTC.getType(),
    });

    GQC.rootQuery().addRelation('resolveUser', () => ({
      resolver: UserTC.getResolver('customResolver'),
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
          name: resolvedName,
        },
      },
    });
  });


  it('compose resolve method with middlewares chain', async () => {
    const UserTC = GQC.get('User');
    const resolvedName = 'myNameIsSlimShady';
    const changeName = name => `wrappedName(${name})`;
    const changeNameAgain = name => `secondWrap(${name})`;
    const resolver1 = new Resolver(UserTC, {
      resolve: () => ({ name: resolvedName }),
      name: 'chainName',
      outputType: UserTC.getType(),
    });

    const M1 = new ResolverMiddleware(UserTC, resolver);
    M1.resolve = next => (resolveArgs) => {
      const payload = next(resolveArgs);
      return { ...payload, name: changeNameAgain(payload.name) };
    };

    const M2 = new ResolverMiddleware(UserTC, resolver);
    M2.resolve = next => (resolveArgs) => {
      const payload = next(resolveArgs);
      return { ...payload, name: changeName(payload.name) };
    };

    resolver1.addMiddleware(M1, M2);

    GQC.rootQuery().addRelation(
      'resolveUserWithMiddleware',
      () => ({ resolver: UserTC.getResolver('chainName') }),
    );

    const schema = GQC.buildSchema();
    const result = await graphql(schema, '{ resolveUserWithMiddleware { name } }');
    expect(
      result
    ).to.deep.equal({
      data: {
        resolveUserWithMiddleware: {
          name: changeNameAgain(changeName(resolvedName)),
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
      });

      newResolver.resolve({ args: { filter: { age: 15 } }, someKey: 16 });

      expect(rpSnap).property('rawQuery').deep.equal({ age: { $gt: 15 }, someKey: 16 });
    });
  });
});
