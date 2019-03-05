import { GraphQLNamedType, GraphQLScalarType } from 'graphql';
import { TypeComposer } from './TypeComposer';
import { InputTypeComposer } from './InputTypeComposer';
import { ScalarTypeComposer } from './ScalarTypeComposer';
import { EnumTypeComposer } from './EnumTypeComposer';
import { InterfaceTypeComposer } from './InterfaceTypeComposer';
import { UnionTypeComposer } from './UnionTypeComposer';

type K = any;
type V<TContext> =
  | TypeComposer<any, TContext>
  | InputTypeComposer
  | EnumTypeComposer
  | InterfaceTypeComposer<TContext>
  | UnionTypeComposer<TContext>
  | ScalarTypeComposer
  | GraphQLNamedType
  | GraphQLScalarType;

export class TypeStorage<TContext> {
  public types: Map<K, V<TContext>>;
  public size: number;

  public constructor();

  public clear(): void;

  public delete(key: K): boolean;

  public entries(): Iterator<[K, V<TContext>]>;

  public forEach(
    callbackfn: (value: V<TContext>, index: K, map: Map<K, V<TContext>>) => any,
    thisArg?: any,
  ): void;

  public get(key: K): V<TContext>;

  public has(key: K): boolean;

  public keys(): Iterator<K>;

  public set(key: K, value: V<TContext>): TypeStorage<TContext>;

  public values(): Iterator<V<TContext>>;

  public add(value: V<TContext>): string | null;

  public hasInstance(key: K, ClassObj: any): boolean;

  public getOrSet(
    key: K,
    typeOrThunk: V<TContext> | (() => V<TContext>),
  ): V<TContext>;

  public getTC(typeName: K): TypeComposer<any, TContext>;

  public getTC<TSource = any>(typeName: K): TypeComposer<TSource, TContext>;

  public getITC(typeName: K): InputTypeComposer;

  public getETC(typeName: K): EnumTypeComposer;

  public getIFTC(typeName: K): InterfaceTypeComposer<TContext>;

  public getUTC(typeName: K): UnionTypeComposer<TContext>;

  public getSTC(typeName: K): ScalarTypeComposer;
}
