export class TypeStorage<V, K = string> {
  public types: Map<K, V>;
  public size: number;

  public constructor();

  public clear(): void;

  public delete(key: K): boolean;

  public entries(): Iterator<[K, V]>;

  public forEach(callbackfn: (value: V, index: K, map: Map<K, V>) => any, thisArg?: any): void;

  public get(key: K): V;

  public has(key: K): boolean;

  public keys(): Iterator<K>;

  public set(key: K, value: V): TypeStorage<V, K>;

  public values(): Iterator<V>;

  public add(value: V): void;

  public hasInstance(key: K, ClassObj: any): boolean;

  public getOrSet(key: K, typeOrThunk: V | (() => V)): V;
}
