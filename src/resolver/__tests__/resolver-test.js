jest.disableAutomock();

jest.mock('../../gqc');
import GQC from '../../gqc';

import {
  graphql,
  GraphQLList,
  GraphQLString,
  GraphQLNonNull,
} from 'graphql';
import { printSchema } from 'graphql/utilities';

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

  it('should be able to return an array (GraphQLList)', () => {
    const resolver = new Resolver('User', { isArray: true });

    expect(resolver.getOutputType() instanceof GraphQLList).toBeTruthy();
  });

  it('should return data from resolve', async () => {
    const resolvedName = 'nameFromResolve';
    const resolver = new Resolver('User', {
      storage: GQC,
      resolve: () => ({ name: resolvedName }),
    });

    GQC.typeComposer('RootQuery')
      .addRelation('resolveUser', resolver);

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
    const resolver = new Resolver('User', {
      storage: GQC,
      resolve: () => ({ name: resolvedName }),
    });

    const M1 = {
      resolve: next => resolveArgs => {
        const payload = next(resolveArgs);
        return { ...payload, name: changeNameAgain(payload.name) };
      },
    };

    const M2 = {
      resolve: next => resolveArgs => {
        const payload = next(resolveArgs);
        return { ...payload, name: changeName(payload.name) };
      },
    };

    resolver.addMiddleware(M1, M2);

    GQC.typeComposer('RootQuery')
      .addRelation('resolveUserWithMiddleware', resolver);

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
