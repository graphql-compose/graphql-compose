import { GraphQLNonNull } from 'graphql';
import { ListComposer } from './ListComposer';
import { AnyTypeComposer, NamedTypeComposer } from './utils/typeHelpers';

export class NonNullComposer<T extends AnyTypeComposer<any>> {
  public ofType: T;

  constructor(type: T);

  public getType(): GraphQLNonNull<any>;

  public getTypeName(): string;

  public getUnwrappedTC(): NamedTypeComposer<any>;

  public getTypePlural(): ListComposer<NonNullComposer<T>>;

  public getTypeNonNull(): NonNullComposer<T>;
}
