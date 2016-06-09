import {
  GraphQLObjectType,
} from 'graphql';
import { addTypeFields, getTypeFields } from './utils/graphql';
import ComposeStorage from './composeStorage';
import MissingType from './type/missingType';

export default class ComposeType {
  constructor(typeName) {
    const type = ComposeStorage.getType(typeName);

    if (type === MissingType) {
      console.log('Create Type', typeName);
      this.type = new GraphQLObjectType({
        name: typeName,
        fields: {},
      });
      ComposeStorage.setType(this.type);
    } else {
      this.type = type;
    }
  }

  addRelation(fieldName, resolver, description, deprecationReason) {
    addTypeFields(this.type, {
      [fieldName]: {
        description,
        deprecationReason,
        ...resolver.getFieldConfig(),
      },
    });
    return this;
  }

  getField(fieldName) {
    const fields = getTypeFields(this.type);

    if (fields.hasOwnProperty(fieldName)) {
      return fields[fieldName];
    }

    return undefined;
  }

  getFieldType(fieldName) {
    const field = this.getField(fieldName);
    if (field) {
      return field.type;
    }
    
    return undefined;
  }

  getType() {
    return this.type;
  }
}
