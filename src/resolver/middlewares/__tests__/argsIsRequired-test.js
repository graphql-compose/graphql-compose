jest.disableAutomock();

import {
  GraphQLString,
  GraphQLNonNull,
} from 'graphql';

import Resolver from '../../resolver';

describe('ArgsIsRequired (resolver middleware)', () => {
  const resolver = new Resolver('TestArgsIsRequired');
  resolver.setArg('argOptional', {
    type: GraphQLString,
  });
  resolver.setArg('argRequired', {
    type: GraphQLString,
    isRequired: true,
  });
  const { args } = resolver.getFieldConfig();

  it('should wrap with GraphQLNonNull args with param isRequired = true', () => {
    expect(args.argRequired.type instanceof GraphQLNonNull).toBeTruthy();
  });

  it('should leave isRequired param', () => {
    expect(args.argRequired.isRequired).toBeTruthy();
  });

  it('should not wrap with GraphQLNonNull args without isRequired param', () => {
    expect(args.argOptional.type).toEqual(GraphQLString);
  });
});
