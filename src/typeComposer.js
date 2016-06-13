import { isFunction } from './utils/misc';
import ResolverList from './resolver/resolverList';
import Resolver from './resolver/resolver';

export default class TypeComposer {
  constructor(gqType, storage) {
    this.gqType = gqType;
    this.storage = storage;
  }

  /**
   * Get fields from a GraphQL type
   * WARNING: this method read an internal GraphQL instance variable.
   */
  _getFields() {
    const fields = this.gqType._typeConfig.fields;
    return isFunction(fields) ? fields() : fields;
  }

  /**
   * Completely replace all fields in GraphQL type
   * WARNING: this method rewrite an internal GraphQL instance variable.
   */
  _setFields(fields) {
    this.gqType._typeConfig.fields = () => fields;
  }


  addRelation(fieldName, resolver, description, deprecationReason) {
    if (!resolver instanceof Resolver) {
      throw new Error('You should provide correct Resolver object.');
    }

    this.addField(fieldName, {
      description,
      deprecationReason,
      ...resolver.getFieldConfig(),
    });
    return this;
  }

  /**
   * Add field to a GraphQL type
   */
  addField(fieldName, fieldConfig) {
    this.addFields({ [fieldName]: fieldConfig });
  }

  /**
   * Add new fields or replace existed in a GraphQL type
   */
  addFields(newFields) {
    this._setFields(Object.assign({}, this._getFields(), newFields));
  }

  /**
   * Get fieldConfig by name
   */
  getField(fieldName) {
    const fields = this._getFields();

    if (fields.hasOwnProperty(fieldName)) {
      return fields[fieldName];
    }

    return undefined;
  }

  removeField(fieldNameOrArray) {
    const fieldNames = Array.isArray(fieldNameOrArray) ? fieldNameOrArray : [fieldNameOrArray];
    const fields = this._getFields();
    fieldNames.forEach((fieldName) => delete fields[fieldName]);
    this._setFields(Object.assign({}, fields)); // immutability
  }

  /**
   * Get fieldType by name
   */
  getFieldType(fieldName) {
    const field = this.getField(fieldName);
    if (field) {
      return field.type;
    }

    return undefined;
  }

  getType() {
    return this.gqType;
  }

  getTypeName() {
    const type = this.getType();
    if (type) {
      return type.name;
    }

    return 'MissingType';
  }

  getQueryResolverList() {
    const injectedParamName = '_gqcQueryResolverList';
    if (!this.gqType.hasOwnProperty(injectedParamName)) {
      this.gqType[injectedParamName] = new ResolverList('query', this);
    }

    return this.gqType[injectedParamName];
  }

  getMutationResolverList() {
    const injectedParamName = '_gqcMutationResolverList';
    if (!this.gqType.hasOwnProperty(injectedParamName)) {
      this.gqType[injectedParamName] = new ResolverList('mutation', this);
    }

    return this.gqType[injectedParamName];
  }
}
