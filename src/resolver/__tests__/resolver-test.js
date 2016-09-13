import { expect } from 'chai';
import {
  graphql,
  GraphQLString,
  GraphQLNonNull,
  GraphQLObjectType,
} from 'graphql';
import GQC from '../../__mocks__/gqc';
import ResolverMiddleware from '../resolverMiddleware';
import Resolver from '../resolver';
import TypeComposer from '../../typeComposer';


describe('Resolver', () => {
  let someTC;
  let resolver;

  beforeEach(() => {
    someTC = new TypeComposer(
      new GraphQLObjectType({ name: 'validType' })
    );
    resolver = new Resolver(someTC, { name: 'find' });
  });


  it('should throw error if not passed TypeComposer', () => {
    expect(() => { new Resolver() }).to.throw();
  });


  it('should throw error if not passed name in opts', () => {
    expect(() => { new Resolver(someTC) }).to.throw();
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
    const resolver = new Resolver(UserTC, {
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
    const changeName = (name) => `wrappedName(${name})`;
    const changeNameAgain = (name) => `secondWrap(${name})`;
    const resolver = new Resolver(UserTC, {
      resolve: () => ({ name: resolvedName }),
      name: 'chainName',
      outputType: UserTC.getType(),
    });

    const M1 = new ResolverMiddleware(UserTC, resolver);
    M1.resolve = next => resolveArgs => {
      const payload = next(resolveArgs);
      return { ...payload, name: changeNameAgain(payload.name) };
    };

    const M2 = new ResolverMiddleware(UserTC, resolver);
    M2.resolve = next => resolveArgs => {
      const payload = next(resolveArgs);
      return { ...payload, name: changeName(payload.name) };
    };

    resolver.addMiddleware(M1, M2);

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
});
