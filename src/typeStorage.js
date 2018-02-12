/* @flow strict */

import { isFunction } from './utils/is';

// TypeStorage has all methods from Map class
export class TypeStorage<V, K = string> {
  types: Map<K, V>;

  constructor(): TypeStorage<V, K> {
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

  delete(key: K): boolean {
    return this.types.delete(key);
  }

  entries(): Iterator<[K, V]> {
    return this.types.entries();
  }

  forEach(callbackfn: (value: V, index: K, map: Map<K, V>) => mixed, thisArg?: any): void {
    return this.types.forEach(callbackfn, thisArg);
  }

  get(key: K): V {
    const v = this.types.get(key);
    if (!v) {
      throw new Error(`Type with name ${JSON.stringify(key)} does not exists in TypeStorage`);
    }
    return v;
  }

  has(key: K): boolean {
    return this.types.has(key);
  }

  keys(): Iterator<K> {
    return this.types.keys();
  }

  set(key: K, value: V): TypeStorage<V, K> {
    this.types.set(key, value);
    return this;
  }

  values(): Iterator<V> {
    return this.types.values();
  }

  add(value: V): void {
    if (value) {
      if (value.getTypeName && value.getTypeName.call) {
        // $FlowFixMe
        this.set(value.getTypeName(), value);
      } else if (value.name) {
        // $FlowFixMe
        this.set(value.name, value);
      }
    }
  }

  hasInstance(key: K, ClassObj: any): boolean {
    if (!this.has(key)) return false;
    const existedType = (this.get(key): any);
    if (existedType && existedType instanceof ClassObj) {
      return true;
    }
    return false;
  }

  getOrSet(key: K, typeOrThunk: V | (() => V)): V {
    const existedType = (this.types.get(key): any);
    if (existedType) {
      return existedType;
    }

    const gqType: any = isFunction(typeOrThunk) ? typeOrThunk() : typeOrThunk;
    if (gqType) {
      this.set(key, gqType);
    }

    return gqType;
  }
}
