/* @flow */
import Resolver from './resolver';
import MissingTypeResolver from '../type/missingTypeResolver';
import type TypeComposer from '../typeComposer';
import type ResolverMiddleware from './resolverMiddleware';

export default class ResolverList {
  typeComposer: TypeComposer;
  resolvers: { [resolverName: string]: Resolver };

  constructor(listType: string, typeComposer: TypeComposer) {
    this.typeComposer = typeComposer;
    this.resolvers = {};
  }

  set(name: string, resolver: Resolver) {
    if (!resolver instanceof Resolver) {
      throw new Error('You should provide Resolver instance to ResolverList.');
    }

    this.resolvers[name] = resolver;
  }

  has(name: string):boolean {
    return !!this.resolvers[name];
  }

  get(name: string) {
    if (this.has(name)) {
      return this.resolvers[name];
    }

    return this._getMissingResolver(name);
  }

  addMiddleware(name: string, resolverMiddleware: ResolverMiddleware) {
    const resolver = this.get(name);
    if (!resolver) {
      throw new Error(`Resolver with name '${name}' not found.`);
    }

    resolver.addMiddleware(resolverMiddleware);
  }

  _getMissingResolver(unknownResolverName: string) {
    const existedTypeName = this.typeComposer.getTypeName();
    return new Resolver({
      outputType: MissingTypeResolver,
      resolve: () =>
        `Missing resolver name '${unknownResolverName}' in type '${existedTypeName}'`,
    });
  }
}
