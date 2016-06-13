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

  it('should be able to create required argument', () => {
    const resolver = new Resolver('User', {
      storage: GQC,
      resolve: () => ({ name: 'Test', age: 13, nickname: 'tEst' }),
    });
    const argName = 'requiredId';
    const argConfig = { type: GraphQLString, isRequired: true };

    resolver.setArg(argName, argConfig);

    // check by type
    const argType = resolver.getArg(argName).type;
    expect(argType instanceof GraphQLNonNull).toBeTruthy();

    // check by printed graphql schema
    GQC.typeComposer('RootQuery').addRelation('userByRequiredId', resolver);
    const schema = GQC.buildSchema();
    expect(printSchema(schema)).toContain('userByRequiredId(requiredId: String!)');
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

  it('compose resolve method with middlewares', async () => {
    const resolvedName = 'nameFromResolve';
    const changeName = (name) => `wrappedName(${name})`;
    const resolver = new Resolver('User', {
      storage: GQC,
      resolve: () => ({ name: resolvedName }),
    });

    resolver.addMiddleware(
      next => resolveArgs => {
        const payload = next(resolveArgs);
        return { ...payload, name: changeName(payload.name) };
      }
    );

    GQC.typeComposer('RootQuery')
      .addRelation('resolveUserWithMiddleware', resolver);

    const schema = GQC.buildSchema();
    const result = await graphql(schema, '{ resolveUserWithMiddleware { name } }');
    expect(
      result
    ).toEqual({
      data: {
        resolveUserWithMiddleware: {
          name: changeName(resolvedName),
        },
      },
    });
  });
});
