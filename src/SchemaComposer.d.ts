import { GraphQLSchema, GraphQLNamedType, GraphQLDirective, SchemaDefinitionNode } from './graphql';
import { TypeComposer } from './TypeComposer';
import { InputTypeComposer } from './InputTypeComposer';
import { TypeStorage } from './TypeStorage';
import { TypeMapper } from './TypeMapper';
import { EnumTypeComposer } from './EnumTypeComposer';
import { InterfaceTypeComposer } from './InterfaceTypeComposer';
import { Resolver } from './Resolver';

type MustHaveTypes<TContext> =
  | TypeComposer<TContext>
  | InputTypeComposer
  | EnumTypeComposer
  | InterfaceTypeComposer<TContext>
  | GraphQLNamedType;

type ExtraSchemaConfig = {
  types?: GraphQLNamedType[] | null,
  directives?: GraphQLDirective[] | null,
  astNode?: SchemaDefinitionNode | null,
};

export class SchemaComposer<TContext> extends TypeStorage<TContext> {
  public TypeMapper: TypeMapper;
  public TypeComposer: typeof TypeComposer;
  public InputTypeComposer: typeof InputTypeComposer;
  public EnumTypeComposer: typeof EnumTypeComposer;
  public InterfaceTypeComposer: typeof InterfaceTypeComposer;
  public Resolver: typeof Resolver;

  public Query: TypeComposer<TContext>;
  public Mutation: TypeComposer<TContext>;
  public Subscription: TypeComposer<TContext>;

  protected _schemaMustHaveTypes: Array<MustHaveTypes<TContext>>;

  public constructor();

  public rootQuery(): TypeComposer<TContext>;

  public rootMutation(): TypeComposer<TContext>;

  public rootSubscription(): TypeComposer<TContext>;

  public buildSchema(extraConfig?: ExtraSchemaConfig): GraphQLSchema;

  public addSchemaMustHaveType(type: MustHaveTypes<TContext>): this;

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

  public getOrCreateIFTC(
    typeName: string,
    onCreate?: (iftc: InterfaceTypeComposer<TContext>) => any
  ): InterfaceTypeComposer<TContext>;
}
