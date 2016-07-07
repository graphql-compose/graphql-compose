import GQC from '../../gqc';
import ResolverMiddleware from '../resolverMiddleware';

import {
  graphql,
  GraphQLString,
  GraphQLNonNull,
} from 'graphql';

import Resolver from '../resolver';


describe('Resolver', () => {
  it('should set and get arg', () => {
    const resolver = new Resolver('SomeType');
    const argName = 'argField';
    const argConfig = { type: GraphQLString };

    resolver.setArg(argName, argConfig);
    expect(resolver.getArg(argName)).toEqual(argConfig);
  });

  it('should remove args and return undefined for non-existed arg', () => {
    const resolver = new Resolver('SomeType');
    const argName = 'argField';
    const argConfig = { type: GraphQLString };

    resolver.setArg(argName, argConfig);
    resolver.removeArg(argName);

    expect(resolver.getArg(argName)).toEqual(undefined);
  });

  it('should return data from resolve', async () => {
    const resolvedName = 'nameFromResolve';
    const resolver = new Resolver(GQC.getType('User'), {
      resolve: () => ({ name: resolvedName }),
    });

    GQC.rootQuery().addRelation('resolveUser', resolver);

    const schema = GQC.buildSchema();
    const result = await graphql(schema, '{ resolveUser { name } }');
    expect(
      result
    ).toEqual({
      data: {
        resolveUser: {
          name: resolvedName,
        },
      },
    });
  });

  it('compose resolve method with middlewares chain', async () => {
    const resolvedName = 'myNameIsSlimShady';
    const changeName = (name) => `wrappedName(${name})`;
    const changeNameAgain = (name) => `secondWrap(${name})`;
    const resolver = new Resolver(GQC.getType('User'), {
      resolve: () => ({ name: resolvedName }),
    });

    const M1 = new ResolverMiddleware();
    M1.resolve = next => resolveArgs => {
      const payload = next(resolveArgs);
      return { ...payload, name: changeNameAgain(payload.name) };
    };

    const M2 = new ResolverMiddleware();
    M2.resolve = next => resolveArgs => {
      const payload = next(resolveArgs);
      return { ...payload, name: changeName(payload.name) };
    };

    resolver.addMiddleware(M1, M2);

    GQC.rootQuery().addRelation('resolveUserWithMiddleware', resolver);

    const schema = GQC.buildSchema();
    const result = await graphql(schema, '{ resolveUserWithMiddleware { name } }');
    expect(
      result
    ).toEqual({
      data: {
        resolveUserWithMiddleware: {
          name: changeNameAgain(changeName(resolvedName)),
        },
      },
    });
  });

  it('should call `ArgsIsRequired` middleware for args internally when call `composeArgs()`',
    () => {
      const resolver = new Resolver('TestArgsIsRequired');
      resolver.setArg('requiredArg', {
        type: GraphQLString,
        isRequired: true,
      });

      const args = resolver.composeArgs();
      expect(args.requiredArg.type instanceof GraphQLNonNull).toBeTruthy();
    }
  );
});
