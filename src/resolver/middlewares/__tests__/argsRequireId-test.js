jest.disableAutomock();
jest.mock('../../../gqc');

import {
  GraphQLString,
  getNamedType,
} from 'graphql/type';

import Resolver from '../../resolver';
import ArgsRequireId from '../argsRequireId';


describe('ArgsRequiredId (resolver middleware)', () => {
  const resolver = new Resolver('Some');
  resolver.addMiddleware(new ArgsRequireId());
  const { args } = resolver.getFieldConfig();

  it('should add `id` arg to resolver', async () => {
    expect(Object.keys(args)).toContain('id');
  });

  it('should set id to named type GraphQLString', async () => {
    expect(getNamedType(args.id.type)).toEqual(GraphQLString);
  });

  it('should set isRequired=true to the id arg config', async () => {
    expect(args.id.isRequired).toBeTruthy();
  });
});
