import ComposeStorage from './composeStorage';

export default class Resolver {
  constructor(typeName, resolverName, opts = {}) {
    this.args = {};
    this.outputTypeName = typeName;

    if (opts.resolve) {
      this.resolve = opts.resolve;
    }
  }
  
  getArg(fieldName) {
  }
  
  setArg(fieldName, argumentConfig) {
  }
  
  resolve(source, args, context, info) {
    return null;
  }

  setResolve(resolve) {
    this.resolve = resolve;
  }
  
  getOutputType() {
    return ComposeStorage.getType(this.outputTypeName);
  }

  getFieldConfig() {
    return {
      type: this.getOutputType(),
      args: this.args,
      resolve: this.resolve,
    };
    
  }
}
