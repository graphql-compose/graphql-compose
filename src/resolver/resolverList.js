/* @flow */
import Resolver from './resolver';
// import MissingTypeResolver from '../type/missingTypeResolver';
import type ResolverMiddleware from './resolverMiddleware';

export default class ResolverList {
  resolvers: { [resolverName: string]: Resolver };

  constructor() {
    this.resolvers = {};
  }

  getKeys(): string[] {
    return Object.keys(this.resolvers);
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

  get(name: string): Resolver | void {
    if (this.has(name)) {
      return this.resolvers[name];
    }
    return undefined;
    // return this._getMissingResolver(name);
  }

  addMiddleware(name: string, resolverMiddleware: ResolverMiddleware) {
    const resolver = this.get(name);
    if (!resolver) {
      throw new Error(`Resolver with name '${name}' not found.`);
    }

    resolver.addMiddleware(resolverMiddleware);
  }

  // _getMissingResolver(unknownResolverName: string) {
  //   const existedTypeName = this.typeComposer.getTypeName();
  //   return new Resolver({
  //     name: 'MissingTypeResolver',
  //     outputType: MissingTypeResolver,
  //     resolve: () =>
  //       Promise.resolve(
  //         `Missing resolver name '${unknownResolverName}' in type '${existedTypeName}'`
  //       ),
  //   });
  // }
}
