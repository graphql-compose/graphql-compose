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
  | ComposeOutputType<TContext>
  | (() =>
      | ComposeFieldConfigAsObject<TSource, TContext>
      | ComposeOutputType<TContext>);

// extended GraphQLFieldConfig
export type GraphqlFieldConfigExtended<TSource, TContext> = GraphQLFieldConfig<
  TSource,
  TContext
> & { projection?: any };

export type ComposeFieldConfigAsObject<TSource, TContext> = {
  type: Thunk<ComposeOutputType<TContext>> | GraphQLOutputType;
  args?: ComposeFieldConfigArgumentMap;
  resolve?: GraphQLFieldResolver<TSource, TContext>;
  subscribe?: GraphQLFieldResolver<TSource, TContext>;
  deprecationReason?: string | null;
  description?: string | null;
  astNode?: FieldDefinitionNode | null;
  [key: string]: any;
} & { $call?: void };

// extended GraphQLOutputType
export type ComposeOutputType<TContext> =
  | GraphQLOutputType
  | TypeComposer<any, TContext>
  | EnumTypeComposer
  | TypeAsString
  | Resolver<any, TContext>
  | Array<
      | GraphQLOutputType
      | TypeComposer<any, TContext>
      | EnumTypeComposer
      | TypeAsString
      | Resolver<any, TContext>
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

export type RelationOpts<TRelationSource, TSource, TContext> =
  | RelationOptsWithResolver<TRelationSource, TSource, TContext>
  | RelationOptsWithFieldConfig<TSource, TContext>;

export type RelationOptsWithResolver<TRelationSource, TSource, TContext> = {
  resolver: Thunk<Resolver<TRelationSource, TContext>>;
  prepareArgs?: RelationArgsMapper<TSource, TContext>;
  projection?: ProjectionType;
  description?: string | null;
  deprecationReason?: string | null;
  catchErrors?: boolean;
};

export type RelationOptsWithFieldConfig<
  TSource,
  TContext
> = ComposeFieldConfigAsObject<TSource, TContext> & {
  resolve: GraphQLFieldResolver<TSource, TContext>;
};

export type ArgsType = { [argName: string]: any };

export type RelationArgsMapperFn<TSource, TContext> = (
  source: TSource,
  args: ArgsType,
  context: TContext,
  info: GraphQLResolveInfo,
) => any;

export type RelationArgsMapper<TSource, TContext> = {
  [argName: string]:
    | RelationArgsMapperFn<TSource, TContext>
    | null
    | void
    | string
    | number
    | any[]
    | GenericMap<any>;
};

export class TypeComposer<TSource, TContext> {
  public static schemaComposer: SchemaComposer<any>;
  public schemaComposer: SchemaComposer<TContext>;

  protected gqType: GraphQLObjectTypeExtended<TSource, TContext>;
  protected _fields: GraphQLFieldConfigMap<TSource, TContext>;

  public constructor(gqType: GraphQLObjectType);

  public static create<TSrc, TCtx>(
    opts:
      | TypeAsString
      | ComposeObjectTypeConfig<TSrc, TCtx>
      | GraphQLObjectType,
  ): TypeComposer<TSrc, TCtx>;

  public static createTemp<TSrc, TCtx>(
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

  public clone<TCloneSource>(
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

  public getResolver(name: string): Resolver<any, TContext>;

  public getResolver<TResolverSource>(
    name: string,
  ): Resolver<TResolverSource, TContext>;

  public setResolver(name: string, resolver: Resolver<any, TContext>): this;

  public setResolver<TResolverSource>(
    name: string,
    resolver: Resolver<TResolverSource, TContext>,
  ): this;

  public addResolver(
    resolver: Resolver<any, TContext> | ResolverOpts<any, TContext>,
  ): this;

  public addResolver<TResolverSource>(
    resolver:
      | Resolver<TResolverSource, TContext>
      | ResolverOpts<TResolverSource, TContext>,
  ): this;

  public removeResolver(resolverName: string): this;

  public wrapResolver(
    resolverName: string,
    cbResolver: ResolverWrapCb<any, TContext>,
  ): this;

  public wrapResolver<TResolverSource>(
    resolverName: string,
    cbResolver: ResolverWrapCb<TResolverSource, TContext>,
  ): this;

  public wrapResolverAs(
    resolverName: string,
    fromResolverName: string,
    cbResolver: ResolverWrapCb<any, TContext>,
  ): this;

  public wrapResolverAs<TResolverSource>(
    resolverName: string,
    fromResolverName: string,
    cbResolver: ResolverWrapCb<TResolverSource, TContext>,
  ): this;

  public wrapResolverResolve(
    resolverName: string,
    cbNextRp: ResolverNextRpCb<any, TContext>,
  ): this;

  public wrapResolverResolve<TResolverSource>(
    resolverName: string,
    cbNextRp: ResolverNextRpCb<TResolverSource, TContext>,
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

  public addRelation<TRelationSource>(
    fieldName: string,
    relationOpts: RelationOpts<TRelationSource, TSource, TContext>,
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

  private _relationWithResolverToFC<TRelationSource>(
    opts: RelationOptsWithResolver<TRelationSource, TSource, TContext>,
    fieldName?: string,
  ): ComposeFieldConfigAsObject<TRelationSource, TContext>;
}
