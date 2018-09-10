import {
  FieldDefinitionNode,
  GraphQLArgumentConfig,
  GraphQLFieldConfig,
  GraphQLFieldConfigArgumentMap,
  GraphQLFieldConfigMap,
  GraphQLFieldResolver,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLInterfaceType,
  GraphQLIsTypeOfFn,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLResolveInfo,
} from 'graphql';
import { EnumTypeComposer } from './EnumTypeComposer';
import { InputTypeComposer } from './InputTypeComposer';
import { InterfaceTypeComposer } from './InterfaceTypeComposer';
import {
  Resolver,
  ResolverNextRpCb,
  ResolverOpts,
  ResolverWrapCb,
} from './Resolver';
import { SchemaComposer } from './SchemaComposer';
import { TypeAsString } from './TypeMapper';
import { GenericMap, ObjMap, Thunk } from './utils/definitions';
import { ProjectionType } from './utils/projection';

export type GetRecordIdFn<TSource, TContext> = (
  source: TSource,
  args: any,
  context: TContext,
) => string;

export type GraphQLObjectTypeExtended<TSource, TContext> = GraphQLObjectType & {
  _gqcInputTypeComposer?: InputTypeComposer;
  _gqcResolvers?: Map<string, Resolver<TSource, TContext>>;
  _gqcGetRecordIdFn?: GetRecordIdFn<TSource, TContext>;
  _gqcRelations?: RelationThunkMap<TSource, TContext>;
  _gqcFields?: ComposeFieldConfigMap<TSource, TContext>;
  _gqcInterfaces?: Array<
    GraphQLInterfaceType | InterfaceTypeComposer<TContext>
  >;
  description: string | null;
};

export type ComposeObjectTypeConfig<TSource, TContext> = {
  name: string;
  interfaces?: Thunk<GraphQLInterfaceType[] | null>;
  fields?: Thunk<ComposeFieldConfigMap<TSource, TContext>>;
  isTypeOf?: GraphQLIsTypeOfFn<TSource, TContext> | null;
  description?: string | null;
  isIntrospection?: boolean;
};

// extended GraphQLFieldConfigMap
export type ComposeFieldConfigMap<TSource, TContext> = ObjMap<
  ComposeFieldConfig<TSource, TContext>
>;

export type ComposeFieldConfig<TSource, TContext> =
  | ComposeFieldConfigAsObject<TSource, TContext>
  | ComposeOutputType<TSource, TContext>
  | Thunk<
      | ComposeFieldConfigAsObject<TSource, TContext>
      | ComposeOutputType<TSource, TContext>
    >;

// extended GraphQLFieldConfig
export type GraphqlFieldConfigExtended<TSource, TContext> = GraphQLFieldConfig<
  TSource,
  TContext
> & { projection?: any };

export type ComposeFieldConfigAsObject<TSource, TContext, TArgs = any> = {
  type: Thunk<ComposeOutputType<TSource, TContext>> | GraphQLOutputType;
  args?: ComposeFieldConfigArgumentMap;
  resolve?: GraphQLFieldResolver<TSource, TContext, TArgs>;
  subscribe?: GraphQLFieldResolver<TSource, TContext>;
  deprecationReason?: string | null;
  description?: string | null;
  astNode?: FieldDefinitionNode | null;
  [key: string]: any;
} & { $call?: void };

// extended GraphQLOutputType
export type ComposeOutputType<TSource, TContext> =
  | GraphQLOutputType
  | TypeComposer<TSource, TContext>
  | EnumTypeComposer
  | TypeAsString
  | Resolver<TSource, TContext>
  | Array<
      | GraphQLOutputType
      | TypeComposer<TSource, TContext>
      | EnumTypeComposer
      | TypeAsString
      | Resolver<TSource, TContext>
    >;

// Compose Args -----------------------------
export type ComposeArgumentType =
  | GraphQLInputType
  | TypeAsString
  | InputTypeComposer
  | EnumTypeComposer
  | Array<
      GraphQLInputType | TypeAsString | InputTypeComposer | EnumTypeComposer
    >;
export type ComposeArgumentConfigAsObject = {
  type: Thunk<ComposeArgumentType> | GraphQLInputType;
  defaultValue?: any;
  description?: string | null;
} & { $call?: void };
export type ComposeArgumentConfig =
  | ComposeArgumentConfigAsObject
  | ComposeArgumentType
  | (() => ComposeArgumentConfigAsObject | ComposeArgumentType);
export type ComposeFieldConfigArgumentMap = {
  [argName: string]: ComposeArgumentConfig;
};

// RELATION -----------------------------
export type RelationThunkMap<TSource, TContext> = {
  [fieldName: string]: Thunk<RelationOpts<any, TSource, TContext>>;
};

export type RelationOpts<TRelationSource, TSource, TContext, TArgs = any> =
  | RelationOptsWithResolver<TRelationSource, TSource, TContext, TArgs>
  | RelationOptsWithFieldConfig<TSource, TContext, TArgs>;

export type RelationOptsWithResolver<
  TRelationSource,
  TSource,
  TContext,
  TArgs = any
> = {
  resolver: Thunk<Resolver<TRelationSource, TContext, TArgs>>;
  prepareArgs?: RelationArgsMapper<TSource, TContext, TArgs>;
  projection?: Partial<ProjectionType<TSource>>;
  description?: string | null;
  deprecationReason?: string | null;
  catchErrors?: boolean;
};

export type RelationOptsWithFieldConfig<
  TSource,
  TContext,
  TArgs = any
> = ComposeFieldConfigAsObject<TSource, TContext, TArgs> & {
  resolve: GraphQLFieldResolver<TSource, TContext, TArgs>;
};

export type ArgsType<T = any> = { [argName in keyof T]: T[argName] };

export type RelationArgsMapperFn<TSource, TContext, TArgs = any> = (
  source: TSource,
  args: ArgsType<TArgs>,
  context: TContext,
  info: GraphQLResolveInfo,
) => any;

export type RelationArgsMapper<TSource, TContext, TArgs = any> = {
  [argName: string]:
    | RelationArgsMapperFn<TSource, TContext, TArgs>
    | null
    | void
    | string
    | number
    | any[]
    | GenericMap<any>;
};

export class TypeComposer<TSource = any, TContext = any> {
  public static schemaComposer: SchemaComposer<any>;
  public schemaComposer: SchemaComposer<TContext>;

  protected gqType: GraphQLObjectTypeExtended<TSource, TContext>;
  protected _fields: GraphQLFieldConfigMap<TSource, TContext>;

  public constructor(gqType: GraphQLObjectType);

  public static create<TSrc = any, TCtx = any>(
    opts:
      | TypeAsString
      | ComposeObjectTypeConfig<TSrc, TCtx>
      | GraphQLObjectType,
  ): TypeComposer<TSrc, TCtx>;

  public static createTemp<TSrc = any, TCtx = any>(
    opts:
      | TypeAsString
      | ComposeObjectTypeConfig<TSrc, TCtx>
      | GraphQLObjectType,
  ): TypeComposer<TSrc, TCtx>;

  // -----------------------------------------------
  // Field methods
  // -----------------------------------------------

  public getFields(): GraphQLFieldConfigMap<TSource, TContext>;

  public getFieldNames(): string[];

  public setFields(
    fields:
      | ComposeFieldConfigMap<TSource, TContext>
      | GraphQLFieldConfigMap<TSource, TContext>,
  ): this;

  public hasField(fieldName: string): boolean;

  public setField(
    fieldName: string,
    fieldConfig: ComposeFieldConfig<TSource, TContext>,
  ): this;

  /**
   * Add new fields or replace existed in a GraphQL type
   */
  public addFields(
    newFields: ComposeFieldConfigMap<TSource, TContext>,
  ): TypeComposer<TSource, TContext>;

  /**
   * Add new fields or replace existed (where field name may have dots)
   */
  public addNestedFields(
    newFields: ComposeFieldConfigMap<TSource, TContext>,
  ): this;

  /**
   * Get fieldConfig by name
   */
  public getField(fieldName: string): ComposeFieldConfig<TSource, TContext>;

  public removeField(
    fieldNameOrArray: string | string[],
  ): TypeComposer<TSource, TContext>;

  public removeOtherFields(
    fieldNameOrArray: string | string[],
  ): TypeComposer<TSource, TContext>;

  public extendField(
    fieldName: string,
    partialFieldConfig: ComposeFieldConfig<any, TContext>,
  ): this;

  public reorderFields(names: string[]): this;

  public getFieldConfig(fieldName: string): GraphQLFieldConfig<any, TContext>;

  public getFieldType(fieldName: string): GraphQLOutputType;

  public getFieldTC(fieldName: string): TypeComposer<TSource, TContext>;

  public isFieldNonNull(fieldName: string): boolean;

  public makeFieldNonNull(fieldNameOrArray: string | string[]): this;

  public makeFieldNullable(fieldNameOrArray: string | string[]): this;

  public deprecateFields(
    fields: { [fieldName: string]: string } | string[] | string,
  ): this;

  public getFieldArgs(fieldName: string): GraphQLFieldConfigArgumentMap;

  public hasFieldArg(fieldName: string, argName: string): boolean;

  public getFieldArg(fieldName: string, argName: string): GraphQLArgumentConfig;

  public getFieldArgType(fieldName: string, argName: string): GraphQLInputType;

  // -----------------------------------------------
  // Type methods
  // -----------------------------------------------

  public getType(): GraphQLObjectType;

  public getTypePlural(): GraphQLList<GraphQLObjectType>;

  public getTypeNonNull(): GraphQLNonNull<GraphQLObjectType>;

  public getTypeName(): string;

  public setTypeName(name: string): this;

  public getDescription(): string;

  public setDescription(description: string): this;

  public clone<TCloneSource = any>(
    newTypeName: string,
  ): TypeComposer<TCloneSource, TContext>;

  // -----------------------------------------------
  // InputType methods
  // -----------------------------------------------

  public getInputType(): GraphQLInputObjectType;

  public hasInputTypeComposer(): boolean;

  public getInputTypeComposer(): InputTypeComposer;

  public getITC(): InputTypeComposer;

  // -----------------------------------------------
  // Resolver methods
  // -----------------------------------------------

  public getResolvers(): Map<string, Resolver<any, TContext>>;

  public hasResolver(name: string): boolean;

  public getResolver<TResolverSource = any, TArgs = any>(
    name: string,
  ): Resolver<TResolverSource, TContext, TArgs>;

  public setResolver<TResolverSource = any, TArgs = any>(
    name: string,
    resolver: Resolver<TResolverSource, TContext, TArgs>,
  ): this;

  public addResolver<TResolverSource = any, TArgs = any>(
    resolver:
      | Resolver<TResolverSource, TContext, TArgs>
      | ResolverOpts<TResolverSource, TContext, TArgs>,
  ): this;

  public removeResolver(resolverName: string): this;

  public wrapResolver<TResolverSource = any, TArgs = any>(
    resolverName: string,
    cbResolver: ResolverWrapCb<TResolverSource, TSource, TContext, TArgs>,
  ): this;

  public wrapResolverAs<TResolverSource = any, TArgs = any>(
    resolverName: string,
    fromResolverName: string,
    cbResolver: ResolverWrapCb<TResolverSource, TSource, TContext, TArgs>,
  ): this;

  public wrapResolverResolve<TResolverSource = any, TArgs = any>(
    resolverName: string,
    cbNextRp: ResolverNextRpCb<TResolverSource, TContext, TArgs>,
  ): this;

  // -----------------------------------------------
  // Interface methods
  // -----------------------------------------------

  public getInterfaces(): Array<
    InterfaceTypeComposer<any> | GraphQLInterfaceType
  >;

  public setInterfaces(
    interfaces: Array<InterfaceTypeComposer<any> | GraphQLInterfaceType>,
  ): this;

  public hasInterface(
    interfaceObj: InterfaceTypeComposer<any> | GraphQLInterfaceType,
  ): boolean;

  public addInterface(
    interfaceObj: InterfaceTypeComposer<any> | GraphQLInterfaceType,
  ): this;

  public removeInterface(
    interfaceObj: InterfaceTypeComposer<any> | GraphQLInterfaceType,
  ): this;

  // -----------------------------------------------
  // Misc methods
  // -----------------------------------------------

  public addRelation(
    fieldName: string,
    relationOpts: RelationOpts<any, TSource, TContext, any>,
  ): this;

  public addRelation<TRelationSource = any, TArgs = any>(
    fieldName: string,
    relationOpts: RelationOpts<TRelationSource, TSource, TContext, TArgs>,
  ): this;

  public getRelations(): RelationThunkMap<any, TContext>;

  public setRecordIdFn(fn: GetRecordIdFn<TSource, TContext>): this;

  public hasRecordIdFn(): boolean;

  public getRecordIdFn(): GetRecordIdFn<TSource, TContext>;

  /**
   * Get function that returns record id, from provided object.
   */
  public getRecordId(
    source: TSource,
    args: any,
    context: TContext,
  ): string | number;

  public get(path: string | string[]): any;

  private _relationWithResolverToFC<TRelationSource, TArgs = any>(
    opts: RelationOptsWithResolver<TRelationSource, TSource, TContext, TArgs>,
    fieldName?: string,
  ): ComposeFieldConfigAsObject<TRelationSource, TContext, TArgs>;
}
