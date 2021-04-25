/* eslint-disable no-unused-vars */

import { isFunction } from './utils/is';
import type { GraphQLType } from './graphql';
import type { NamedTypeComposer } from './utils/typeHelpers';
import { ListComposer } from './ListComposer';
import { NonNullComposer } from './NonNullComposer';
import { inspect } from './utils/misc';
import type { SchemaComposer } from './SchemaComposer';

export class ThunkComposer<
  T extends NamedTypeComposer<any> = NamedTypeComposer<any>,
  G extends GraphQLType = GraphQLType
> {
  _thunk: () => T;
  _typeName: string | undefined;
  _typeFromThunk: T | undefined;

  get ofType(): T {
    if (!this._typeFromThunk) {
      this._typeFromThunk = this._thunk();
    }
    if (!this._typeFromThunk) {
      throw new Error(
        `ThunkComposer(${this._typeName || ''}) returns empty value: ${inspect(
          this._typeFromThunk
        )}`
      );
    }
    return this._typeFromThunk;
  }

  constructor(thunk: () => T, typeName?: string) {
    this._thunk = thunk;
    if (typeName && typeof typeName === 'string') {
      this._typeName = typeName;
    }
  }

  getUnwrappedTC(): T {
    return this.ofType;
  }

  getType(): G {
    return (this.ofType as any).getType();
  }

  getTypeName(): string {
    if (this._typeFromThunk && isFunction(this._typeFromThunk.getTypeName)) {
      return this._typeFromThunk.getTypeName();
    } else if (this._typeName) {
      return this._typeName;
    }
    return this.getUnwrappedTC().getTypeName();
  }

  getTypePlural(): ListComposer<ThunkComposer<T, G>> {
    return new ListComposer(this);
  }

  getTypeNonNull(): NonNullComposer<ThunkComposer<T, G>> {
    return new NonNullComposer(this);
  }

  /**
   * Get Type wrapped in List modifier
   */
  get List(): ListComposer<ThunkComposer<T, G>> {
    return new ListComposer(this);
  }

  /**
   * Get Type wrapped in NonNull modifier
   */
  get NonNull(): NonNullComposer<ThunkComposer<T, G>> {
    return new NonNullComposer(this);
  }

  /**
   * Clone this type to another SchemaComposer.
   * Also will be cloned all wrapped types.
   */
  cloneTo(
    anotherSchemaComposer: SchemaComposer<any>,
    cloneMap: Map<any, any> = new Map()
  ): ThunkComposer<NamedTypeComposer<any>, G> {
    const cloned = (this.ofType as any).cloneTo(anotherSchemaComposer, cloneMap);
    return new ThunkComposer(() => cloned, this._typeName);
  }
}
