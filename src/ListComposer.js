/* @flow strict */

import { GraphQLList } from './graphql';
import {
  isNamedTypeComposer,
  type AnyTypeComposer,
  type NamedTypeComposer,
} from './utils/typeHelpers';
import { NonNullComposer } from './NonNullComposer';
import type { SchemaComposer } from './SchemaComposer';

export class ListComposer<+T: AnyTypeComposer<any>> {
  +ofType: T;

  constructor(type: T): ListComposer<T> {
    this.ofType = type;

    // alive proper Flow type casting in autosuggestions for class with Generics
    /* :: return this; */
  }

  getType(): GraphQLList<any> {
    return new GraphQLList(this.ofType.getType());
  }

  getTypeName(): string {
    return `[${this.ofType.getTypeName()}]`;
  }

  getUnwrappedTC(): NamedTypeComposer<any> {
    let tc = this;
    while (!isNamedTypeComposer(tc)) {
      tc = tc.ofType;
    }
    return tc;
  }

  getTypePlural(): ListComposer<ListComposer<T>> {
    return new ListComposer(this);
  }

  getTypeNonNull(): NonNullComposer<ListComposer<T>> {
    return new NonNullComposer(this);
  }

  /**
   * Clone this type to another SchemaComposer.
   * Also will be clonned all wrapped types.
   */
  cloneTo(
    anotherSchemaComposer: SchemaComposer<any>,
    cloneMap?: Map<any, any> = new Map()
  ): ListComposer<AnyTypeComposer<any>> {
    return new ListComposer((this.ofType: any).cloneTo(anotherSchemaComposer, cloneMap));
  }
}
