import {
    GraphQLArgumentConfig, GraphQLFieldConfig, GraphQLFieldConfigArgumentMap, GraphQLFieldConfigMap,
    GraphQLInputObjectType, GraphQLInterfaceType, GraphQLList, GraphQLObjectType, GraphQLInputType,
    GraphQLOutputType, GraphQLFieldResolver, GraphQLIsTypeOfFn, GraphQLResolveInfo,
    FieldDefinitionNode, GraphQLNonNull
} from './graphql';
import { SchemaComposer } from './SchemaComposer';
import { InputTypeComposer } from './InputTypeComposer';
import { EnumTypeComposer } from './EnumTypeComposer';
import { InterfaceTypeComposer } from './InterfaceTypeComposer';
import { TypeAsString } from './TypeMapper';
import { Resolver, ResolverOpts, ResolverNextRpCb, ResolverWrapCb } from './Resolver';
import { ProjectionType } from './utils/projection';
import { GenericMap, ObjMap, Thunk } from './utils/definitions';

export type GetRecordIdFn<TSource, TContext> = (source: TSource, args: any, context: TContext) => string;

export type GraphQLObjectTypeExtended<TSource, TContext> = GraphQLObjectType & {
    _gqcInputTypeComposer?: InputTypeComposer,
    _gqcResolvers?: Map<string, Resolver<TSource, TContext>>,
    _gqcGetRecordIdFn?: GetRecordIdFn<TSource, TContext>,
    _gqcRelations?: RelationThunkMap<TSource, TContext>,
    _gqcFields?: ComposeFieldConfigMap<TSource, TContext>,
    _gqcInterfaces?: Array<GraphQLInterfaceType | InterfaceTypeComposer<TContext>>,
    description: string | null,
};

export type ComposeObjectTypeConfig<TSource, TContext> = {
    name: string,
    interfaces?: Thunk<GraphQLInterfaceType[] | null>,
    fields?: Thunk<ComposeFieldConfigMap<TSource, TContext>>,
    isTypeOf?: GraphQLIsTypeOfFn<TSource, TContext> | null,
    description?: string | null,
    isIntrospection?: boolean,
};

// extended GraphQLFieldConfigMap
export type ComposeFieldConfigMap<TSource, TContext> = ObjMap<
    ComposeFieldConfig<TSource, TContext>
>;

export type ComposeFieldConfig<TSource, TContext> =
    | ComposeFieldConfigAsObject<TSource, TContext>
    | ComposeOutputType<TContext>
    | (() => ComposeFieldConfigAsObject<TSource, TContext> | ComposeOutputType<TContext>);

// extended GraphQLFieldConfig
export type GraphqlFieldConfigExtended<TSource, TContext> =
    GraphQLFieldConfig<TSource, TContext> & { projection?: any };

export type ComposeFieldConfigAsObject<TSource, TContext> = {
    type: Thunk<ComposeOutputType<TContext>> | GraphQLOutputType,
    args?: ComposeFieldConfigArgumentMap,
    resolve?: GraphQLFieldResolver<TSource, TContext>,
    subscribe?: GraphQLFieldResolver<TSource, TContext>,
    deprecationReason?: string | null,
    description?: string | null,
    astNode?: FieldDefinitionNode | null,
    [key: string]: any,
} & { $call?: void };

// extended GraphQLOutputType
export type ComposeOutputType<TContext> =
    | GraphQLOutputType
    | TypeComposer<TContext>
    | EnumTypeComposer
    | TypeAsString
    | Resolver<any, TContext>
    | Array<GraphQLOutputType | TypeComposer<TContext> | EnumTypeComposer | TypeAsString | Resolver<any, TContext>>;

// Compose Args -----------------------------
export type ComposeArgumentType =
    | GraphQLInputType
    | TypeAsString
    | InputTypeComposer
    | EnumTypeComposer
    | Array<GraphQLInputType | TypeAsString | InputTypeComposer | EnumTypeComposer>;
export type ComposeArgumentConfigAsObject = {
    type: Thunk<ComposeArgumentType> | GraphQLInputType,
    defaultValue?: any,
    description?: string | null,
} & { $call?: void };
export type ComposeArgumentConfig =
    | ComposeArgumentConfigAsObject
    | ComposeArgumentType
    | (() => ComposeArgumentConfigAsObject | ComposeArgumentType);
export type ComposeFieldConfigArgumentMap = {
    [argName: string]: ComposeArgumentConfig,
};

// RELATION -----------------------------
export type RelationThunkMap<TSource, TContext> = {
    [fieldName: string]: Thunk<RelationOpts<TSource, TContext>>,
};

export type RelationOpts<TSource, TContext> =
    | RelationOptsWithResolver<TSource, TContext>
    | RelationOptsWithFieldConfig<TSource, TContext>;

export type RelationOptsWithResolver<TSource, TContext> = {
    resolver: Thunk<Resolver<TSource, TContext>>,
    prepareArgs?: RelationArgsMapper<TSource, TContext>,
    projection?: ProjectionType,
    description?: string | null,
    deprecationReason?: string | null,
    catchErrors?: boolean,
};

export type RelationOptsWithFieldConfig<TSource, TContext> =
    ComposeFieldConfigAsObject<TSource, TContext> & { resolve: GraphQLFieldResolver<TSource, TContext> };

export type ArgsType = { [argName: string]: any };

export type RelationArgsMapperFn<TSource, TContext> = (
    source: TSource,
    args: ArgsType,
    context: TContext,
    info: GraphQLResolveInfo) => any;

export type RelationArgsMapper<TSource, TContext> = {
    [argName: string]: | RelationArgsMapperFn<TSource, TContext>
        | null
        | void
        | string
        | number
        | any[]
        | GenericMap<any>
};

export class TypeComposer<TContext> {
    public static schemaComposer: SchemaComposer<any>;
    public schemaComposer: SchemaComposer<any>;

    protected gqType: GraphQLObjectTypeExtended<any, TContext>;
    protected _fields: GraphQLFieldConfigMap<any, TContext>;

    public constructor(gqType: GraphQLObjectType);

    public static create<TCtx>(
        opts:
            | TypeAsString
            | ComposeObjectTypeConfig<any, TCtx>
            | GraphQLObjectType): TypeComposer<TCtx>;

    public static createTemp<TCtx>(
        opts:
            | TypeAsString
            | ComposeObjectTypeConfig<any, TCtx>
            | GraphQLObjectType): TypeComposer<TCtx>;

    // -----------------------------------------------
    // Field methods
    // -----------------------------------------------

    public getFields(): GraphQLFieldConfigMap<any, TContext>;

    public getFieldNames(): string[];

    public setFields(fields: ComposeFieldConfigMap<any, TContext> | GraphQLFieldConfigMap<any, TContext>): this;

    public hasField(fieldName: string): boolean;

    public setField<TSource, TContext>(fieldName: string, fieldConfig: ComposeFieldConfig<TSource, TContext>): this;

    /**
     * Add new fields or replace existed in a GraphQL type
     */
    public addFields(newFields: ComposeFieldConfigMap<any, TContext>): this;

    /**
     * Add new fields or replace existed (where field name may have dots)
     */
    public addNestedFields(newFields: ComposeFieldConfigMap<any, TContext>): this;

    /**
     * Get fieldConfig by name
     */
    public getField(fieldName: string): ComposeFieldConfig<any, TContext>;

    public removeField(fieldNameOrArray: string | string[]): this;

    public removeOtherFields(fieldNameOrArray: string | string[]): this;

    public extendField(fieldName: string, parialFieldConfig: ComposeFieldConfig<any, TContext>): this;

    public reorderFields(names: string[]): this;

    public getFieldConfig(fieldName: string): GraphQLFieldConfig<any, TContext>;

    public getFieldType(fieldName: string): GraphQLOutputType;

    public getFieldTC(fieldName: string): TypeComposer<TContext>;

    public isFieldNonNull(fieldName: string): boolean;

    public makeFieldNonNull(fieldNameOrArray: string | string[]): TypeComposer<TContext>;

    public makeFieldNullable(fieldNameOrArray: string | string[]): TypeComposer<TContext>;

    public deprecateFields(fields: { [fieldName: string]: string } | string[] | string): this;

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

    public clone(newTypeName: string): TypeComposer<TContext>;

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

    public setResolver(name: string, resolver: Resolver<any, TContext>): this;

    public addResolver(resolver: Resolver<any, TContext> | ResolverOpts<any, TContext>): this;

    public removeResolver(resolverName: string): this;

    public wrapResolver(resolverName: string, cbResolver: ResolverWrapCb<any, TContext>): this;

    public wrapResolverAs(
      resolverName: string, fromResolverName: string, cbResolver: ResolverWrapCb<any, TContext>): this;

    public wrapResolverResolve(resolverName: string, cbNextRp: ResolverNextRpCb<any, TContext>): this;

    // -----------------------------------------------
    // Interface methods
    // -----------------------------------------------

    public getInterfaces(): Array<InterfaceTypeComposer<TContext> | GraphQLInterfaceType>;

    public setInterfaces(interfaces: Array<InterfaceTypeComposer<TContext> | GraphQLInterfaceType>): this;

    public hasInterface(interfaceObj: InterfaceTypeComposer<TContext> | GraphQLInterfaceType): boolean;

    public addInterface(interfaceObj: InterfaceTypeComposer<TContext> | GraphQLInterfaceType): this;

    public removeInterface(interfaceObj: InterfaceTypeComposer<TContext> | GraphQLInterfaceType): this;

    // -----------------------------------------------
    // Misc methods
    // -----------------------------------------------

    public addRelation(fieldName: string, relationOpts: RelationOpts<any, TContext>): this;

    public getRelations(): RelationThunkMap<any, TContext>;

    public setRecordIdFn(fn: GetRecordIdFn<any, TContext>): this;

    public hasRecordIdFn(): boolean;

    public getRecordIdFn(): GetRecordIdFn<any, TContext>;

    /**
     * Get function that returns record id, from provided object.
     */
    public getRecordId(source: any, args: any, context: TContext): string | number;

    public get(path: string | string[]): any;

    private _relationWithResolverToFC<TSource>(
        opts: RelationOptsWithResolver<TSource, TContext>,
        fieldName?: string): ComposeFieldConfigAsObject<TSource, TContext>;
}
