import { GraphQLNonNull } from 'graphql';
import { ListComposer } from './ListComposer';
import { AnyTypeComposer, NamedTypeComposer } from './utils/typeHelpers';
import { SchemaComposer } from './SchemaComposer';

export class NonNullComposer<T extends AnyTypeComposer<any>> {
  public ofType: T;

  constructor(type: T);

  public getType(): GraphQLNonNull<any>;

  public getTypeName(): string;

  public getUnwrappedTC(): NamedTypeComposer<any>;

  public getTypePlural(): ListComposer<NonNullComposer<T>>;

  public getTypeNonNull(): NonNullComposer<T>;

  /**
   * Clone this type to another SchemaComposer.
   * Also will be clonned all wrapped types.
   */
  public cloneTo<TCtx = any>(
    anotherSchemaComposer: SchemaComposer<TCtx>,
    cloneMap?: Map<any, any>
  ): NonNullComposer<AnyTypeComposer<TCtx>>;
}
