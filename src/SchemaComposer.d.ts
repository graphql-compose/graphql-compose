import { GraphQLSchema, GraphQLNamedType } from './graphql';
import { TypeComposer } from './TypeComposer';
import { InputTypeComposer } from './InputTypeComposer';
import { TypeStorage } from './TypeStorage';
import { TypeMapper } from './TypeMapper';
import { EnumTypeComposer } from './EnumTypeComposer';
import { Resolver } from './Resolver';

export class SchemaComposer<TContext> extends TypeStorage<TContext> {
  public TypeMapper: TypeMapper;
  public TypeComposer: typeof TypeComposer;
  public InputTypeComposer: typeof InputTypeComposer;
  public EnumTypeComposer: typeof EnumTypeComposer;
  public Resolver: typeof Resolver;

  public Query: TypeComposer<TContext>;
  public Mutation: TypeComposer<TContext>;
  public Subscription: TypeComposer<TContext>;

  public constructor();

  public rootQuery(): TypeComposer<TContext>;

  public rootMutation(): TypeComposer<TContext>;

  public rootSubscription(): TypeComposer<TContext>;

  public buildSchema(): GraphQLSchema;

  public removeEmptyTypes(typeComposer: TypeComposer<TContext>, passedTypes: Set<string>): void;

  public getOrCreateTC(
    typeName: string,
    onCreate?: (tc: TypeComposer<TContext>) => any
  ): TypeComposer<TContext>;

  public getOrCreateITC(
    typeName: string,
    onCreate?: (itc: InputTypeComposer) => any
  ): InputTypeComposer;

  public getOrCreateETC(
    typeName: string,
    onCreate?: (etc: EnumTypeComposer) => any
  ): EnumTypeComposer;
}
