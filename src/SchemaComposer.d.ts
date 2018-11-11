import {
  GraphQLSchema,
  GraphQLNamedType,
  GraphQLDirective,
  SchemaDefinitionNode,
  GraphQLResolveInfo,
} from 'graphql';
import { TypeComposer } from './TypeComposer';
import { InputTypeComposer } from './InputTypeComposer';
import { TypeStorage } from './TypeStorage';
import { TypeMapper } from './TypeMapper';
import { EnumTypeComposer } from './EnumTypeComposer';
import { InterfaceTypeComposer } from './InterfaceTypeComposer';
import { Resolver } from './Resolver';

type MustHaveTypes<TContext> =
  | TypeComposer<any, TContext>
  | InputTypeComposer
  | EnumTypeComposer
  | InterfaceTypeComposer<TContext>
  | GraphQLNamedType;

type ExtraSchemaConfig = {
  types?: GraphQLNamedType[] | null;
  directives?: GraphQLDirective[] | null;
  astNode?: SchemaDefinitionNode | null;
};

type AddResolveMethods<TContext> = {
  [typeName: string]: {
    [fieldName: string]: (
      source: any,
      args: {},
      context: TContext,
      info: GraphQLResolveInfo,
    ) => any;
  };
};

export class SchemaComposer<TContext> extends TypeStorage<TContext> {
  public TypeMapper: TypeMapper;
  public TypeComposer: typeof TypeComposer;
  public InputTypeComposer: typeof InputTypeComposer;
  public EnumTypeComposer: typeof EnumTypeComposer;
  public InterfaceTypeComposer: typeof InterfaceTypeComposer;
  public Resolver: typeof Resolver;

  public Query: TypeComposer<any, TContext>;
  public Mutation: TypeComposer<any, TContext>;
  public Subscription: TypeComposer<any, TContext>;

  protected _schemaMustHaveTypes: Array<MustHaveTypes<TContext>>;

  public constructor();

  public rootQuery<TRootQuery = any>(): TypeComposer<TRootQuery, TContext>;

  public rootMutation<TRootMutation = any>(): TypeComposer<
    TRootMutation,
    TContext
  >;

  public rootSubscription<TRootSubscription = any>(): TypeComposer<
    TRootSubscription,
    TContext
  >;

  public buildSchema(extraConfig?: ExtraSchemaConfig): GraphQLSchema;

  public addSchemaMustHaveType(type: MustHaveTypes<TContext>): this;

  public removeEmptyTypes(
    typeComposer: TypeComposer<any, TContext>,
    passedTypes: Set<string>,
  ): void;

  public getOrCreateTC<TSource = any>(
    typeName: string,
    onCreate?: (tc: TypeComposer<TSource, TContext>) => any,
  ): TypeComposer<TSource, TContext>;

  public getOrCreateITC(
    typeName: string,
    onCreate?: (itc: InputTypeComposer) => any,
  ): InputTypeComposer;

  public getOrCreateETC(
    typeName: string,
    onCreate?: (etc: EnumTypeComposer) => any,
  ): EnumTypeComposer;

  public getOrCreateIFTC(
    typeName: string,
    onCreate?: (iftc: InterfaceTypeComposer<TContext>) => any,
  ): InterfaceTypeComposer<TContext>;

  public addTypeDefs(typeDefs: string): TypeStorage<GraphQLNamedType>;

  public addResolveMethods(
    typesFieldsResolve: AddResolveMethods<TContext>,
  ): void;
}
