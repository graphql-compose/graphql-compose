import { GraphQLList } from 'graphql';
import { NonNullComposer } from './NonNullComposer';
import { AnyTypeComposer, NamedTypeComposer } from './utils/typeHelpers';
import { SchemaComposer } from './SchemaComposer';

export class ListComposer<T extends AnyTypeComposer<any>> {
  public ofType: T;

  constructor(type: T);

  public getType(): GraphQLList<any>;

  public getTypeName(): string;

  public getUnwrappedTC(): NamedTypeComposer<any>;

  public getTypePlural(): ListComposer<ListComposer<T>>;

  public getTypeNonNull(): NonNullComposer<ListComposer<T>>;

  /**
   * Clone this type to another SchemaComposer.
   * Also will be clonned all wrapped types.
   */
  public cloneTo<TCtx = any>(
    anotherSchemaComposer: SchemaComposer<TCtx>,
    cloneMap?: Map<any, any>
  ): ListComposer<AnyTypeComposer<TCtx>>;
}
