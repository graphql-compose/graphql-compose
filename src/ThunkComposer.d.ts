import { isFunction } from './utils/is';
import { GraphQLType } from './graphql';
import { NamedTypeComposer } from './utils/typeHelpers';
import { ListComposer } from './ListComposer';
import { NonNullComposer } from './NonNullComposer';
import { inspect } from './utils/misc';

export class ThunkComposer<
  T extends NamedTypeComposer<any> = NamedTypeComposer<any>,
  G extends GraphQLType = GraphQLType
> {
  protected thunk: Function;
  protected typeName: string | void;
  protected _typeFromThunk: T | void;
  public ofType: T;

  constructor(thunk: Function, typeName?: string);

  public getUnwrappedTC(): T;

  public getType(): G;

  public getTypeName(): string;

  public getTypePlural(): ListComposer<ThunkComposer<T, G>>;

  public getTypeNonNull(): NonNullComposer<ThunkComposer<T, G>>;
}
