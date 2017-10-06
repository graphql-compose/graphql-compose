import {
    GraphQLArgumentConfig, GraphQLFieldConfig, GraphQLFieldConfigArgumentMap, GraphQLFieldConfigMap,
    GraphQLInputObjectType, GraphQLInterfaceType, GraphQLList, GraphQLObjectType, GraphQLOutputType,
    GraphQLFieldResolver, GraphQLInputType, GraphQLIsTypeOfFn, GraphQLResolveInfo
} from './graphql';
import { TypeDefinitionString, TypeNameString, TypeWrappedString } from './typeMapper';
import {
    ResolverOpts, ResolverNextRpCb, ResolverWrapCb,
    ProjectionMapType, ProjectionType
} from './resolver';
import InputTypeComposer from './inputTypeComposer';
import Resolver from './resolver';

export type GetRecordIdFn<TSource, TContext> = (source: TSource, args: any, context: TContext) => string;

type Thunk<T> = (() => T) | T;

export type ComposeFieldConfigMap<TSource, TContext> = {
    [fieldName: string]:
        | ComposeFieldConfig<TSource, TContext>
        | Thunk<ComposeFieldConfig<TSource, TContext>>
        | Array<ComposeFieldConfig<TSource, TContext>>
        | Thunk<Array<ComposeFieldConfig<TSource, TContext>>>
        | GraphQLFieldConfig<TSource, TContext>
        | Thunk<GraphQLFieldConfig<TSource, TContext>>
} | GraphQLFieldConfigMap<TSource, TContext>;

export type ComposeFieldConfig<TSource, TContext> = {
    type: ComposeOutputType | ComposeOutputType[],
    args?: ComposeFieldConfigArgumentMap,
    resolve?: GraphQLFieldResolver<TSource, TContext>,
    subscribe?: GraphQLFieldResolver<TSource, TContext>,
    deprecationReason?: string | null,
    description?: string | null,
} | ComposeOutputType | GraphQLFieldConfig<TSource, TContext>;

export type ComposeOutputType =
    | GraphQLOutputType
    | TypeComposer
    | TypeWrappedString
    | TypeDefinitionString
    | TypeNameString
    | Resolver<any, any>
    | (() => ComposeOutputType);

export type ComposeArgumentType =
    | GraphQLInputType
    | string
    | InputTypeComposer
    | GraphQLArgumentConfig
    | (() => ComposeArgumentType);

export type ComposeArgumentConfig = {
    type: ComposeArgumentType,
    defaultValue?: any,
    description?: string | null,
} | ComposeArgumentType | (() => ComposeArgumentConfig);

export type ComposeFieldConfigArgumentMap = {
    [argName: string]: ComposeArgumentConfig | ComposeArgumentConfig[],
};

export type ComposeObjectTypeConfig<TSource, TContext> = {
    name: string,
    interfaces?: Thunk<GraphQLInterfaceType[] | null>,
    fields?: Thunk<ComposeFieldConfigMap<TSource, TContext>>,
    isTypeOf?: GraphQLIsTypeOfFn<TSource, TContext> | null,
    description?: string | null,
    isIntrospection?: boolean,
};

export type GraphQLObjectTypeExtended = GraphQLObjectType & {
    _gqcInputTypeComposer?: InputTypeComposer,
    _gqcResolvers?: Map<string, Resolver<any, any>>,
    _gqcGetRecordIdFn?: GetRecordIdFn<any, any>,
    _gqcProjectionMapper?: ProjectionMapType,
    _gqcRelations?: RelationThunkMap<any, any>,
    description: string | null,
};

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

export type RelationOptsWithFieldConfig<TSource, TContext> = {
    type: ComposeOutputType,
    args?: ComposeFieldConfigArgumentMap,
    resolve: GraphQLFieldResolver<TSource, TContext>,
    projection?: ProjectionType,
    description?: string | null,
    deprecationReason?: string | null,
};

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
        | object
};

export default class TypeComposer {
    public gqType: GraphQLObjectTypeExtended;
    private _fields: ComposeFieldConfigMap<any, any>;

    public constructor(gqType: GraphQLObjectType);

    public static create(
        opts:
            | TypeNameString
            | TypeDefinitionString
            | ComposeObjectTypeConfig<any, any>
            | GraphQLObjectType): TypeComposer;

    /**
     * Get fields from a GraphQL type
     * WARNING: this method read an internal GraphQL instance variable.
     */
    public getFields(): GraphQLFieldConfigMap<any, any>;

    public getFieldNames(): string[];

    /**
     * Completely replace all fields in GraphQL type
     * WARNING: this method rewrite an internal GraphQL instance variable.
     */
    public setFields(fields: ComposeFieldConfigMap<any, any>): this;

    public hasField(fieldName: string): boolean;

    public setField<TSource, TContext>(fieldName: string, fieldConfig: ComposeFieldConfig<TSource, TContext>): this;

    /**
     * Add new fields or replace existed in a GraphQL type
     */
    public addFields(newFields: ComposeFieldConfigMap<any, any>): this;

    /**
     * Get fieldConfig by name
     */
    public getField(fieldName: string): GraphQLFieldConfig<any, any>;

    public removeField(fieldNameOrArray: string | string[]): this;

    public removeOtherFields(fieldNameOrArray: string | string[]): this;

    public extendField(fieldName: string, parialFieldConfig: ComposeFieldConfig<any, any>): this;

    public reorderFields(names: string[]): this;

    public addRelation(fieldName: string, relationOpts: RelationOpts<any, any>): this;

    public getRelations(): RelationThunkMap<any, any>;

    /**
     * @deprecated 3.0.0
     */
    public buildRelations(): this;

    /**
     * @deprecated 3.0.0
     */
    public buildRelation(): this;

    /**
     * Get fields from a GraphQL type
     * WARNING: this method read an internal GraphQL instance variable.
     */
    public getInterfaces(): GraphQLInterfaceType[];

    /**
     * Completely replace all interfaces in GraphQL type
     * WARNING: this method rewrite an internal GraphQL instance variable.
     */
    public setInterfaces(interfaces: GraphQLInterfaceType[]): this;

    public hasInterface(interfaceObj: GraphQLInterfaceType): boolean;

    public addInterface(interfaceObj: GraphQLInterfaceType): this;

    public removeInterface(interfaceObj: GraphQLInterfaceType): this;

    public clone(newTypeName: string): TypeComposer;

    /**
     * Get fieldType by name
     */
    public getFieldType(fieldName: string): GraphQLOutputType;

    public getFieldTC(fieldName: string): TypeComposer;

    public getType(): GraphQLObjectType;

    public getTypePlural(): GraphQLList<GraphQLObjectType>;

    public getInputType(): GraphQLInputObjectType;

    public hasInputTypeComposer(): boolean;

    public getInputTypeComposer(): InputTypeComposer;

    public getResolvers(): Map<string, Resolver<any, any>>;

    public hasResolver(name: string): boolean;

    public getResolver(name: string): Resolver<any, any>;

    public setResolver(name: string, resolver: Resolver<any, any>): this;

    public addResolver(resolver: Resolver<any, any> | ResolverOpts<any, any>): this;

    public removeResolver(resolverName: string): this;

    public wrapResolver(resolverName: string, cbResolver: ResolverWrapCb<any, any>): this;

    public wrapResolverAs(resolverName: string, fromResolverName: string, cbResolver: ResolverWrapCb<any, any>): this;

    public wrapResolverResolve(resolverName: string, cbNextRp: ResolverNextRpCb<any, any>): this;

    public getTypeName(): string;

    public setTypeName(name: string): this;

    public getDescription(): string;

    public setDescription(description: string): this;

    public setRecordIdFn(fn: GetRecordIdFn<any, any>): this;

    public hasRecordIdFn(): boolean;

    public getRecordIdFn(): GetRecordIdFn<any, any>;

    /**
     * Get function that returns record id, from provided object.
     */
    public getRecordId(source: any, args: any, context: any): string | number;

    public getFieldArgs(fieldName: string): GraphQLFieldConfigArgumentMap;

    public hasFieldArg(fieldName: string, argName: string): boolean;

    public getFieldArg(fieldName: string, argName: string): GraphQLArgumentConfig;

    public get(path: string | string[]): any;

    public addProjectionMapper(fieldName: string, sourceProjection: ProjectionType): TypeComposer;

    public getProjectionMapper(): ProjectionMapType;

    public deprecateFields(fields: { [fieldName: string]: string } | string[] | string): this;

    private _relationWithResolverToFC<TSource, TContext>(
        opts: RelationOptsWithResolver<TSource, TContext>,
        fieldName?: string): ComposeFieldConfig<TSource, TContext>;
}
