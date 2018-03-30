import {
    GraphQLArgumentConfig, GraphQLFieldConfig, GraphQLFieldConfigArgumentMap, GraphQLFieldConfigMap,
    GraphQLInputObjectType, GraphQLInterfaceType, GraphQLList, GraphQLObjectType, GraphQLInputType,
    GraphQLOutputType, GraphQLFieldResolver, GraphQLIsTypeOfFn, GraphQLResolveInfo,
    FieldDefinitionNode, GraphQLNonNull
} from './graphql';
import { InputTypeComposer } from './InputTypeComposer';
import { EnumTypeComposer } from './EnumTypeComposer';
import { TypeAsString } from './TypeMapper';
import { Resolver, ResolverOpts, ResolverNextRpCb, ResolverWrapCb } from './Resolver';
import { ProjectionType } from './utils/projection';
import { GenericMap, ObjMap, Thunk } from './utils/definitions';

export type GetRecordIdFn<TSource, TContext> = (source: TSource, args: any, context: TContext) => string;

export type GraphQLObjectTypeExtended = GraphQLObjectType & {
    _gqcInputTypeComposer?: InputTypeComposer,
    _gqcResolvers?: Map<string, Resolver<any, any>>,
    _gqcGetRecordIdFn?: GetRecordIdFn<any, any>,
    _gqcRelations?: RelationThunkMap<any, any>,
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
    | ComposeOutputType
    | (() => ComposeFieldConfigAsObject<TSource, TContext> | ComposeOutputType);

// extended GraphQLFieldConfig
export type GraphqlFieldConfigExtended<TSource, TContext> =
    GraphQLFieldConfig<TSource, TContext> & { projection?: any };

export type ComposeFieldConfigAsObject<TSource, TContext> = {
    type: Thunk<ComposeOutputType> | GraphQLOutputType,
    args?: ComposeFieldConfigArgumentMap,
    resolve?: GraphQLFieldResolver<TSource, TContext>,
    subscribe?: GraphQLFieldResolver<TSource, TContext>,
    deprecationReason?: string | null,
    description?: string | null,
    astNode?: FieldDefinitionNode | null,
    [key: string]: any,
} & { $call?: void };

// extended GraphQLOutputType
export type ComposeOutputType =
    | GraphQLOutputType
    | TypeComposer
    | EnumTypeComposer
    | TypeAsString
    | Resolver<any, any>
    | Array<GraphQLOutputType | TypeComposer | EnumTypeComposer | TypeAsString | Resolver<any, any>>;

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

export class TypeComposer {
    public gqType: GraphQLObjectTypeExtended;
    private _fields: GraphQLFieldConfigMap<any, any>;

    public constructor(gqType: GraphQLObjectType);

    public static create(
        opts:
            | TypeAsString
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
    public setFields(fields: ComposeFieldConfigMap<any, any> | GraphQLFieldConfigMap<any, any>): this;

    public hasField(fieldName: string): boolean;

    public setField<TSource, TContext>(fieldName: string, fieldConfig: ComposeFieldConfig<TSource, TContext>): this;

    /**
     * Add new fields or replace existed in a GraphQL type
     */
    public addFields(newFields: ComposeFieldConfigMap<any, any>): this;

    /**
     * Add new fields or replace existed (where field name may have dots)
     */
    public addNestedFields(newFields: ComposeFieldConfigMap<any, any>): this;

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

    public makeFieldNonNull(fieldNameOrArray: string | string[]): TypeComposer;

    public makeFieldNullable(fieldNameOrArray: string | string[]): TypeComposer;

    public getType(): GraphQLObjectType;

    public getTypePlural(): GraphQLList<GraphQLObjectType>;

    public getTypeNonNull(): GraphQLNonNull<GraphQLObjectType>;

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

    public deprecateFields(fields: { [fieldName: string]: string } | string[] | string): this;

    private _relationWithResolverToFC<TSource, TContext>(
        opts: RelationOptsWithResolver<TSource, TContext>,
        fieldName?: string): ComposeFieldConfigAsObject<TSource, TContext>;
}
