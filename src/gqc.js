/* @flow */

import { GraphQLObjectType, GraphQLSchema } from './graphql';
import { deprecate } from './utils/debug';
import TypeStorage from './typeStorage';
import type Resolver from './resolver';
import TypeComposer from './typeComposer';
import InputTypeComposer from './inputTypeComposer';

export class GQCClass extends TypeStorage<TypeComposer | InputTypeComposer> {
  getOrCreateTC(typeName: string): TypeComposer {
    if (!this.hasInstance(typeName, TypeComposer)) {
      this.set(typeName, TypeComposer.create(typeName));
    }
    // $FlowFixMe
    return this.get(typeName);
  }

  getOrCreateITC(typeName: string): InputTypeComposer {
    if (!this.hasInstance(typeName, InputTypeComposer)) {
      this.set(typeName, InputTypeComposer.create(typeName));
    }
    // $FlowFixMe
    return this.get(typeName);
  }

  getTC(typeName: string): TypeComposer {
    if (!this.hasInstance(typeName, TypeComposer)) {
      throw new Error(`GQC does not have TypeComposer with name ${typeName}`);
    }
    return (this.types.get(typeName): any);
  }

  getITC(typeName: string): InputTypeComposer {
    if (!this.hasInstance(typeName, InputTypeComposer)) {
      throw new Error(`GQC does not have InputTypeComposer with name ${typeName}`);
    }
    return (this.types.get(typeName): any);
  }

  rootQuery(): TypeComposer {
    return this.getOrCreateTC('Query');
  }

  rootMutation(): TypeComposer {
    return this.getOrCreateTC('Mutation');
  }

  rootSubscription(): TypeComposer {
    return this.getOrCreateTC('Subscription');
  }

  /**
   * @deprecated 3.0.0
   */
  resolvers(typeName: string): Map<string, Resolver<any, any>> {
    deprecate('Use `GQC.get(typeName).getResolvers()` explicitly.');
    // $FlowFixMe
    return this.get(typeName).getResolvers();
  }

  /**
   * @deprecated 3.0.0
   */
  resolver(typeName: string, resolverName: string): ?Resolver<any, any> {
    deprecate('Use `GQC.get(typeName).getResolver()` explicitly.');
    // $FlowFixMe
    return this.get(typeName).getResolver(resolverName);
  }

  buildSchema(): GraphQLSchema {
    const roots = {};

    if (this.has('Query')) {
      const tc = this.getTC('Query');
      this.removeEmptyTypes(tc, new Set());
      roots.query = tc.getType();
    }

    if (this.has('Mutation')) {
      const tc = this.getTC('Mutation');
      this.removeEmptyTypes(tc, new Set());
      roots.mutation = tc.getType();
    }

    if (this.has('Subscription')) {
      const tc = this.getTC('Subscription');
      this.removeEmptyTypes(tc, new Set());
      roots.subscription = tc.getType();
    }

    if (Object.keys(roots).length === 0) {
      throw new Error(
        'Can not build schema. Must be initialized at least one ' +
          'of the following types: Query, Mutation, Subscription.'
      );
    }

    return new GraphQLSchema(roots);
  }

  /**
   * @deprecated 3.0.0
   */
  buildRelations() {
    deprecate(
      'No need in calling buildRelations() any more. You may safely remove call of this method.'
    );
    return this;
  }

  removeEmptyTypes(typeComposer: TypeComposer, passedTypes: Set<string> = new Set()) {
    const fields = typeComposer.getFields();
    Object.keys(fields).forEach(fieldName => {
      const fieldType = fields[fieldName].type;
      if (fieldType instanceof GraphQLObjectType) {
        const typeName = fieldType.name;
        if (!passedTypes.has(typeName)) {
          passedTypes.add(typeName);
          const tc = new TypeComposer(fieldType);
          if (Object.keys(tc.getFields()).length > 0) {
            this.removeEmptyTypes(tc, passedTypes);
          } else {
            // eslint-disable-next-line
            console.log(
              `GQC: Delete field '${typeComposer.getTypeName()}.${fieldName}' ` +
                `with type '${tc.getTypeName()}', cause it does not have fields.`
            );
            delete fields[fieldName];
          }
        }
      }
    });
    typeComposer.setFields(fields);
  }
}

const GQC = new GQCClass();

export default GQC;
