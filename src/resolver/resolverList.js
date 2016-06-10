import Resolver from './resolver';

export default class ResolverList {
  constructor(listType, typeComposer) {
    this.typeComposer = typeComposer;
    this.resolvers = {};
  }

  setResolver(name, resolver) {
    if (!resolver instanceof Resolver) {
      throw new Error('You should provide Resolver instance to ResolverList.');
    }
    this.resolvers[name] = resolver;
  }

  hasResolver(name) {
    return this.resolvers.hasOwnProperty(name);
  }

  getResolver(name) {
    if (this.hasResolver(name)) {
      return this.resolvers[name];
    }

    return null;
  }

  addMiddleware(name, resolverMiddleware) {
    const resolver = this.getResolver(name);
    if (!resolver) {
      throw new Error(`Resolver with name '${name}' not found.`);
    }

    resolver.addMiddleware(resolverMiddleware);
  }
}
