import { GraphQLList } from 'graphql';
import { NonNullComposer } from './NonNullComposer';
import { AnyTypeComposer, NamedTypeComposer } from './utils/typeHelpers';

export class ListComposer<T extends AnyTypeComposer<any>> {
  public ofType: T;

  constructor(type: T);

  public getType(): GraphQLList<any>;

  public getTypeName(): string;

  public getUnwrappedTC(): NamedTypeComposer<any>;

  public getTypePlural(): ListComposer<ListComposer<T>>;

  public getTypeNonNull(): NonNullComposer<ListComposer<T>>;
}
