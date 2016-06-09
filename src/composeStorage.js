import MissingType from './type/missingType';
import MissingTypeResolver from './type/missingTypeResolver';
import Resolver from './resolver';

const resolversParamName = '_composeResolvers';

class ComposeStorage {
  constructor() {
    console.log('create new storage');
    this.types = {};
  }

  hasType(typeName) {
    return this.types.hasOwnProperty(typeName);
  }

  getType(typeName) {
    if (this.hasType(typeName)) {
      return this.types[typeName];
    }

    return MissingType;
  }

  setType(typeObject) {
    console.log('set type', typeObject.name);
    this.types[typeObject.name] = typeObject;
  }

  getTypeResolver(typeName, resolverName = 'default') {
    const type = this.getType(typeName);

    if (type === MissingType) {
      return this._getMissingTypeResolver(typeName);
    }

    if (!type.hasOwnProperty(resolversParamName)
      || !type[resolversParamName].hasOwnProperty(resolverName)) {
      return this._getMissingTypeResolverResolver(typeName, resolverName);
    }

    return type[resolversParamName][resolverName];
  }

  _getMissingTypeResolver(unknownTypeName) {
    return new Resolver('MissingType', 'default', {
      resolve: () => `Missing type name '${unknownTypeName}'`,
    });
  }

  _getMissingTypeResolverResolver(existedTypeName, unknownResolverName) {
    if (!this.hasType('MissingTypeResolver')) {
      this.setType(MissingTypeResolver);
    }

    return new Resolver('MissingTypeResolver', 'default', {
      resolve: () =>
        `Missing resolver name '${unknownResolverName}' in type: '${existedTypeName}'`,
    });
  }
}

const composeStorage = new ComposeStorage();

export default composeStorage;