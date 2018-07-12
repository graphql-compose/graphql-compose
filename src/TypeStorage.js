/* @flow strict */

import { isFunction } from './utils/is';
import { TypeComposer } from './TypeComposer';
import { InputTypeComposer } from './InputTypeComposer';
import { EnumTypeComposer } from './EnumTypeComposer';
import { InterfaceTypeComposer } from './InterfaceTypeComposer';
import type { GraphQLNamedType } from './graphql';

type K = any;
type V<TContext> =
  | TypeComposer<TContext>
  | InputTypeComposer
  | EnumTypeComposer
  | InterfaceTypeComposer<TContext>
  | GraphQLNamedType;

// TypeStorage has all methods from Map class
export class TypeStorage<TContext> {
  types: Map<K, V<TContext>>;

  constructor(): TypeStorage<TContext> {
    this.types = new Map();

    // alive proper Flow type casting in autosuggestions
    /* :: return this; */
  }

  get size(): number {
    return this.types.size;
  }

  clear(): void {
    this.types.clear();
  }

  delete(typeName: K): boolean {
    return this.types.delete(typeName);
  }

  entries(): Iterator<[K, V<TContext>]> {
    return this.types.entries();
  }

  forEach(
    callbackfn: (value: V<TContext>, index: K, map: Map<K, V<TContext>>) => mixed,
    thisArg?: any
  ): void {
    return this.types.forEach(callbackfn, thisArg);
  }

  get(typeName: K): V<TContext> {
    const v = this.types.get(typeName);
    if (!v) {
      throw new Error(`Type with name ${JSON.stringify(typeName)} does not exists in TypeStorage`);
    }
    return v;
  }

  has(typeName: K): boolean {
    return this.types.has(typeName);
  }

  keys(): Iterator<K> {
    return this.types.keys();
  }

  set(typeName: K, value: V<TContext>): TypeStorage<TContext> {
    this.types.set(typeName, value);
    return this;
  }

  values(): Iterator<V<TContext>> {
    return this.types.values();
  }

  add(value: V<TContext>): ?string {
    if (value) {
      let typeName: ?string;
      if (value.getTypeName && value.getTypeName.call) {
        // $FlowFixMe
        typeName = (value.getTypeName(): any);
      } else if (value.name) {
        typeName = (value.name: any);
      }

      if (typeName) {
        this.set(typeName, value);
        return typeName;
      }
    }
    return null;
  }

  hasInstance(typeName: K, ClassObj: any): boolean {
    if (!this.has(typeName)) return false;
    const existedType = this.get(typeName);
    if (existedType && existedType instanceof ClassObj) {
      return true;
    }
    return false;
  }

  getOrSet(typeName: K, typeOrThunk: V<TContext> | (() => V<TContext>)): V<TContext> {
    const existedType = (this.types.get(typeName): any);
    if (existedType) {
      return existedType;
    }

    const gqType: any = isFunction(typeOrThunk) ? typeOrThunk() : typeOrThunk;
    if (gqType) {
      this.set(typeName, gqType);
    }

    return gqType;
  }

  getTC(typeName: K): TypeComposer<TContext> {
    if (!this.hasInstance(typeName, TypeComposer)) {
      throw new Error(`Cannot find TypeComposer with name ${typeName}`);
    }
    return (this.get(typeName): any);
  }

  getITC(typeName: K): InputTypeComposer {
    if (!this.hasInstance(typeName, InputTypeComposer)) {
      throw new Error(`Cannot find InputTypeComposer with name ${typeName}`);
    }
    return (this.get(typeName): any);
  }

  getETC(typeName: K): EnumTypeComposer {
    if (!this.hasInstance(typeName, EnumTypeComposer)) {
      throw new Error(`Cannot find EnumTypeComposer with name ${typeName}`);
    }
    return (this.get(typeName): any);
  }

  getIFTC(typeName: K): InterfaceTypeComposer<TContext> {
    if (!this.hasInstance(typeName, InterfaceTypeComposer)) {
      throw new Error(`Cannot find InterfaceTypeComposer with name ${typeName}`);
    }
    return (this.get(typeName): any);
  }
}
