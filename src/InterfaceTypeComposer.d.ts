import {
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLList,
  GraphQLNonNull,
  getNamedType,
  GraphQLFieldConfig,
  GraphQLFieldConfigMap,
  GraphQLOutputType,
  GraphQLInputType,
  GraphQLFieldConfigArgumentMap,
  GraphQLArgumentConfig,
  GraphQLTypeResolver,
  GraphQLResolveInfo,
} from './graphql';
import { TypeAsString } from './TypeMapper';
import {
  Resolver,
  ResolverOpts,
  ResolverNextRpCb,
  ResolverWrapCb,
} from './Resolver';
import { ProjectionType } from './utils/projection';
import { Thunk } from './utils/definitions';

import { isObject, isString } from './utils/is';
import { resolveMaybeThunk } from './utils/misc';
import { SchemaComposer } from './SchemaComposer';
import {
  TypeComposer,
  ComposeFieldConfigMap,
  ComposeFieldConfig,
} from './TypeComposer';

export type GraphQLInterfaceTypeExtended<
  TSource,
  TContext
> = GraphQLInterfaceType & {
  _gqcFields?: ComposeFieldConfigMap<TSource, TContext>;
  _gqcTypeResolvers?: InterfaceTypeResolversMap<TSource, TContext>;
};

export type InterfaceTypeResolversMap<TSource, TContext> = Map<
  TypeComposer<any, TContext> | GraphQLObjectType,
  InterfaceTypeResolverCheckFn<TSource, TContext>
>;

type MaybePromise<T> = Promise<T> | T;

export type InterfaceTypeResolverCheckFn<TSource, TContext> = (
  value: TSource,
  context: TContext,
  info: GraphQLResolveInfo,
) => MaybePromise<boolean | null | undefined>;

export type ComposeInterfaceTypeConfig<TSource, TContext> = {
  name: string;
  fields?: Thunk<ComposeFieldConfigMap<TSource, TContext>>;
  resolveType?: GraphQLTypeResolver<TSource, TContext> | null;
  description?: string | null;
};

export class InterfaceTypeComposer<TContext> {
  public static schemaComposer: SchemaComposer<any>;
  public schemaComposer: SchemaComposer<any>;

  protected gqType: GraphQLInterfaceTypeExtended<any, TContext>;

  public constructor(gqType: GraphQLInterfaceType);

  public static create<TCtx>(
    opts:
      | TypeAsString
      | ComposeInterfaceTypeConfig<any, TCtx>
      | GraphQLInterfaceType,
  ): InterfaceTypeComposer<TCtx>;

  public static createTemp<TCtx>(
    opts:
      | TypeAsString
      | ComposeInterfaceTypeConfig<any, TCtx>
      | GraphQLInterfaceType,
  ): InterfaceTypeComposer<TCtx>;

  // -----------------------------------------------
  // Field methods
  // -----------------------------------------------

  public hasField(name: string): boolean;

  public getFields(): ComposeFieldConfigMap<any, TContext>;

  public getField(name: string): ComposeFieldConfig<any, TContext>;

  public getFieldNames(): string[];

  public setFields(
    fields: ComposeFieldConfigMap<any, TContext>,
  ): InterfaceTypeComposer<TContext>;

  public setField(
    name: string,
    fieldConfig: ComposeFieldConfig<any, TContext>,
  ): InterfaceTypeComposer<TContext>;

  /**
   * Add new fields or replace existed in a GraphQL type
   */
  public addFields(
    newValues: ComposeFieldConfigMap<any, TContext>,
  ): InterfaceTypeComposer<TContext>;

  public removeField(
    nameOrArray: string | string[],
  ): InterfaceTypeComposer<TContext>;

  public removeOtherFields(
    fieldNameOrArray: string | string[],
  ): InterfaceTypeComposer<TContext>;

  public reorderFields(names: string[]): InterfaceTypeComposer<TContext>;

  public extendField(
    fieldName: string,
    parialFieldConfig: ComposeFieldConfig<any, TContext>,
  ): InterfaceTypeComposer<TContext>;

  public isFieldNonNull(fieldName: string): boolean;

  public getFieldConfig(fieldName: string): GraphQLFieldConfig<any, TContext>;

  public getFieldType(fieldName: string): GraphQLOutputType;

  public getFieldTC<TSource>(
    fieldName: string,
  ): TypeComposer<TSource, TContext>;

  public makeFieldNonNull(
    fieldNameOrArray: string | string[],
  ): InterfaceTypeComposer<TContext>;

  public makeFieldNullable(
    fieldNameOrArray: string | string[],
  ): InterfaceTypeComposer<TContext>;

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

  public getType(): GraphQLInterfaceType;

  public getTypePlural(): GraphQLList<GraphQLInterfaceType>;

  public getTypeNonNull(): GraphQLNonNull<GraphQLInterfaceType>;

  public getTypeName(): string;

  public setTypeName(name: string): InterfaceTypeComposer<TContext>;

  public getDescription(): string;

  public setDescription(description: string): InterfaceTypeComposer<TContext>;

  public clone(newTypeName: string): InterfaceTypeComposer<TContext>;

  // -----------------------------------------------
  // ResolveType methods
  // -----------------------------------------------

  public hasTypeResolver(
    type: TypeComposer<any, TContext> | GraphQLObjectType,
  ): boolean;

  public getTypeResolvers(): InterfaceTypeResolversMap<any, TContext>;

  public getTypeResolverCheckFn(
    type: TypeComposer<any, TContext> | GraphQLObjectType,
  ): InterfaceTypeResolverCheckFn<any, TContext>;

  public getTypeResolverNames(): string[];

  public getTypeResolverTypes(): GraphQLObjectType[];

  public setTypeResolvers(
    typeResolversMap: InterfaceTypeResolversMap<any, TContext>,
  ): InterfaceTypeComposer<TContext>;

  public addTypeResolver(
    type: TypeComposer<any, TContext> | GraphQLObjectType,
    checkFn: InterfaceTypeResolverCheckFn<any, TContext>,
  ): InterfaceTypeComposer<TContext>;

  public removeTypeResolver(
    type: TypeComposer<any, TContext> | GraphQLObjectType,
  ): InterfaceTypeComposer<TContext>;

  // -----------------------------------------------
  // Misc methods
  // -----------------------------------------------

  public get(path: string | string[]): any;
}
