import { isFunction } from './utils/is';
import { inspect } from './utils/misc';

// TypeStorage has all methods from Map class
export class TypeStorage<K = any, V = any> {
  types: Map<K | string, V>;

  constructor() {
    this.types = new Map();
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

  entries(): Iterator<[K | string, V]> {
    return this.types.entries();
  }

  forEach(
    callbackfn: (value: V, index: K | string, map: Map<K | string, V>) => unknown,
    thisArg?: any
  ): void {
    return this.types.forEach(callbackfn, thisArg);
  }

  get(typeName: K): V {
    const v = this.types.get(typeName);
    if (!v) {
      throw new Error(`Type with name ${inspect(typeName)} does not exists`);
    }
    return v;
  }

  has(typeName: K): boolean {
    return this.types.has(typeName);
  }

  keys(): Iterator<K | string> {
    return this.types.keys();
  }

  set(typeName: K | string, value: V): TypeStorage<K, V> {
    this.types.set(typeName, value);
    return this;
  }

  values(): Iterator<V> {
    return this.types.values();
  }

  add(value: V): string | null {
    if (value) {
      let typeName: string | undefined;
      if ((value as any).getTypeName && (value as any).getTypeName.call) {
        typeName = (value as any).getTypeName();
      } else if ((value as any).name) {
        typeName = (value as any).name;
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

  getOrSet(typeName: K, typeOrThunk: V | ((schemaComposer: this) => V)): V {
    const existedType = this.types.get(typeName);
    if (existedType) {
      return existedType;
    }

    const gqType: any = isFunction(typeOrThunk) ? typeOrThunk(this) : typeOrThunk;
    if (gqType) {
      this.set(typeName, gqType);
    }

    return gqType;
  }
}
