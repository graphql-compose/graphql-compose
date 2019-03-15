import {
  GraphQLSchema,
  GraphQLNamedType,
  GraphQLDirective,
  SchemaDefinitionNode,
  GraphQLResolveInfo,
} from 'graphql';
import {
  ObjectTypeComposer,
  ObjectTypeComposerDefinition,
} from './ObjectTypeComposer';
import {
  InputTypeComposer,
  InputTypeComposerDefinition,
} from './InputTypeComposer';
import {
  ScalarTypeComposer,
  ScalarTypeComposerDefinition,
} from './ScalarTypeComposer';
import {
  EnumTypeComposer,
  EnumTypeComposerDefinition,
} from './EnumTypeComposer';
import {
  InterfaceTypeComposer,
  InterfaceTypeComposerDefinition,
} from './InterfaceTypeComposer';
import {
  UnionTypeComposer,
  UnionTypeComposerDefinition,
} from './UnionTypeComposer';
import { TypeStorage } from './TypeStorage';
import { TypeMapper } from './TypeMapper';
import { Resolver } from './Resolver';

type ExtraSchemaConfig = {
  types?: GraphQLNamedType[] | null;
  directives?: GraphQLDirective[] | null;
  astNode?: SchemaDefinitionNode | null;
};

type MustHaveTypes<TContext> =
  | ObjectTypeComposer<any, TContext>
  | InputTypeComposer
  | EnumTypeComposer
  | InterfaceTypeComposer<any, TContext>
  | UnionTypeComposer<any, TContext>
  | ScalarTypeComposer
  | GraphQLNamedType;

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
  public typeMapper: TypeMapper;

  public Query: ObjectTypeComposer<any, TContext>;
  public Mutation: ObjectTypeComposer<any, TContext>;
  public Subscription: ObjectTypeComposer<any, TContext>;

  protected _schemaMustHaveTypes: Array<MustHaveTypes<TContext>>;
  protected _directives: GraphQLDirective[];

  public constructor();
  public rootQuery<TSource = any>(): ObjectTypeComposer<TSource, TContext>;

  public rootMutation<TSource = any>(): ObjectTypeComposer<TSource, TContext>;

  public rootSubscription<TSource = any>(): ObjectTypeComposer<
    TSource,
    TContext
  >;

  public buildSchema(extraConfig?: ExtraSchemaConfig): GraphQLSchema;

  public addSchemaMustHaveType(type: MustHaveTypes<TContext>): this;

  public removeEmptyTypes(
    tc: ObjectTypeComposer<any, TContext>,
    passedTypes: Set<string>,
  ): void;

  public getOrCreateOTC<TSource = any>(
    typeName: string,
    onCreate?: (tc: ObjectTypeComposer<TSource, TContext>) => any,
  ): ObjectTypeComposer<TSource, TContext>;

  public getOrCreateITC(
    typeName: string,
    onCreate?: (itc: InputTypeComposer) => any,
  ): InputTypeComposer;

  public getOrCreateETC(
    typeName: string,
    onCreate?: (etc: EnumTypeComposer) => any,
  ): EnumTypeComposer;

  public getOrCreateIFTC<TSource = any>(
    typeName: string,
    onCreate?: (iftc: InterfaceTypeComposer<TSource, TContext>) => any,
  ): InterfaceTypeComposer<TSource, TContext>;

  public getOrCreateUTC<TSource = any>(
    typeName: string,
    onCreate?: (utc: UnionTypeComposer<TSource, TContext>) => any,
  ): UnionTypeComposer<TSource, TContext>;

  public getOrCreateSTC(
    typeName: string,
    onCreate?: (stc: ScalarTypeComposer) => any,
  ): ScalarTypeComposer;

  public getOTC<TSource = any>(
    typeName: any,
  ): ObjectTypeComposer<TSource, TContext>;

  public getITC(typeName: any): InputTypeComposer;

  public getETC(typeName: any): EnumTypeComposer;

  public getIFTC<TSource = any>(
    typeName: any,
  ): InterfaceTypeComposer<TSource, TContext>;

  public getUTC<TSource = any>(
    typeName: any,
  ): UnionTypeComposer<TSource, TContext>;

  public getSTC(typeName: any): ScalarTypeComposer;

  public getAnyTC(
    typeName: any,
  ):
    | ObjectTypeComposer<any, TContext>
    | InputTypeComposer
    | EnumTypeComposer
    | InterfaceTypeComposer<any, TContext>
    | UnionTypeComposer<any, TContext>
    | ScalarTypeComposer;

  public add(typeOrSDL: any): string | null;

  public addAsComposer(typeOrSDL: any): string;

  public addTypeDefs(typeDefs: string): TypeStorage<GraphQLNamedType>;

  public addResolveMethods(
    typesFieldsResolve: AddResolveMethods<TContext>,
  ): void;

  // alias for createObjectTC
  public createTC<TSource = any>(
    typeDef: ObjectTypeComposerDefinition<TSource, TContext>,
  ): ObjectTypeComposer<TSource, TContext>;

  public createObjectTC<TSource = any>(
    typeDef: ObjectTypeComposerDefinition<TSource, TContext>,
  ): ObjectTypeComposer<TSource, TContext>;

  public createInputTC(typeDef: InputTypeComposerDefinition): InputTypeComposer;

  public createEnumTC(typeDef: EnumTypeComposerDefinition): EnumTypeComposer;

  public createInterfaceTC<TSource = any>(
    typeDef: InterfaceTypeComposerDefinition<TSource, TContext>,
  ): InterfaceTypeComposer<TSource, TContext>;

  public createUnionTC<TSource = any>(
    typeDef: UnionTypeComposerDefinition<TSource, TContext>,
  ): UnionTypeComposer<TSource, TContext>;

  public createScalarTC(
    typeDef: ScalarTypeComposerDefinition,
  ): ScalarTypeComposer;

  public addDirective(directive: GraphQLDirective): this;

  public removeDirective(directive: GraphQLDirective): this;

  public getDirectives(): GraphQLDirective[];

  public hasDirective(directive: string | GraphQLDirective): boolean;
}
