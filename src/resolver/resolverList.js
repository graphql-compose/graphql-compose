import Resolver from './resolver';
import MissingTypeResolver from '../type/missingTypeResolver';

export default class ResolverList {
  constructor(listType, typeComposer) {
    this.typeComposer = typeComposer;
    this.resolvers = {};
  }

  set(name, resolver) {
    if (!resolver instanceof Resolver) {
      throw new Error('You should provide Resolver instance to ResolverList.');
    }
    this.resolvers[name] = resolver;
  }

  has(name) {
    return this.resolvers.hasOwnProperty(name);
  }

  get(name) {
    if (this.has(name)) {
      return this.resolvers[name];
    }

    return this._getMissingResolver(name);
  }

  addMiddleware(name, resolverMiddleware) {
    const resolver = this.getResolver(name);
    if (!resolver) {
      throw new Error(`Resolver with name '${name}' not found.`);
    }

    resolver.addMiddleware(resolverMiddleware);
  }

  _getMissingResolver(unknownResolverName) {
    const existedTypeName = this.typeComposer.getTypeName();
    return new Resolver('MissingTypeResolver', {
      type: MissingTypeResolver,
      resolve: () =>
        `Missing resolver name '${unknownResolverName}' in type '${existedTypeName}'`,
    });
  }
}
