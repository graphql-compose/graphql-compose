import { GraphQLNamedType, GraphQLScalarType } from 'graphql';
import { ObjectTypeComposer } from './ObjectTypeComposer';
import { InputTypeComposer } from './InputTypeComposer';
import { ScalarTypeComposer } from './ScalarTypeComposer';
import { EnumTypeComposer } from './EnumTypeComposer';
import { InterfaceTypeComposer } from './InterfaceTypeComposer';
import { UnionTypeComposer } from './UnionTypeComposer';

type K = any;
type V<TContext> =
  | ObjectTypeComposer<any, TContext>
  | InputTypeComposer
  | EnumTypeComposer
  | InterfaceTypeComposer<any, TContext>
  | UnionTypeComposer<any, TContext>
  | ScalarTypeComposer
  | GraphQLNamedType
  | GraphQLScalarType;

export class TypeStorage<TContext> {
  public types: Map<K, V<TContext>>;
  public readonly size: number;

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

  public set(key: K, value: V<TContext>): this;

  public values(): Iterator<V<TContext>>;

  public add(value: V<TContext>): string | null;

  public hasInstance(key: K, ClassObj: any): boolean;

  public getOrSet(
    key: K,
    typeOrThunk: V<TContext> | (() => V<TContext>),
  ): V<TContext>;
}
