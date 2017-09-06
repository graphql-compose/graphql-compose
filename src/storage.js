/* @flow */

import { GraphQLObjectType, GraphQLSchema } from './graphql';
import { deprecate } from './utils/debug';
import TypeComposer from './typeComposer';
import type Resolver from './resolver';

export default class ComposeStorage {
  types: { [typeName: string]: TypeComposer };

  constructor() {
    this.types = {};
  }

  has(typeName: string): boolean {
    return !!this.types[typeName];
  }

  add(typeComposer: TypeComposer): void {
    if (!(typeComposer instanceof TypeComposer)) {
      throw new Error('You must provide instance of TypeComposer');
    }

    this.types[typeComposer.getTypeName()] = typeComposer;
  }

  clear(): void {
    this.types = {};
  }

  get(typeName: string): TypeComposer {
    if (!this.has(typeName)) {
      this.types[typeName] = TypeComposer.create(typeName);
    }
    return this.types[typeName];
  }

  rootQuery(): TypeComposer {
    return this.get('Query');
  }

  rootMutation(): TypeComposer {
    return this.get('Mutation');
  }

  rootSubscription(): TypeComposer {
    return this.get('Subscription');
  }

  resolvers(typeName: string): Map<string, Resolver<*, *>> {
    return this.get(typeName).getResolvers();
  }

  resolver(typeName: string, resolverName: string): ?Resolver<*, *> {
    return this.get(typeName).getResolver(resolverName);
  }

  buildSchema(): GraphQLSchema {
    const roots = {};

    if (this.has('Query')) {
      const tc = this.get('Query');
      this.removeEmptyTypes(tc, new Set());
      roots.query = tc.getType();
    }

    if (this.has('Mutation')) {
      const tc = this.get('Mutation');
      this.removeEmptyTypes(tc, new Set());
      roots.mutation = tc.getType();
    }

    if (this.has('Subscription')) {
      const tc = this.get('Subscription');
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
