import {
    GraphQLInputFieldConfig, GraphQLInputFieldConfigMap, GraphQLInputObjectType,
    GraphQLNonNull, GraphQLInputType
} from './graphql';
import { TypeDefinitionString, TypeNameString, TypeWrappedString } from './typeMapper';

export type ComposeInputFieldConfigMap = {
    [fieldName: string]: | ComposeInputFieldConfig
        | ComposeInputFieldConfig[]
        | GraphQLInputFieldConfig,
} | GraphQLInputFieldConfigMap;

export type ComposeInputFieldConfig = {
    type: ComposeInputType | ComposeInputType[],
    defaultValue?: any,
    description?: string | null,
} | ComposeInputType | GraphQLInputFieldConfig;

type Thunk<T> = (() => T) | T;

export type ComposeInputType =
    | InputTypeComposer
    | GraphQLInputType
    | TypeWrappedString
    | TypeDefinitionString
    | TypeNameString
    | (() => ComposeInputType);

export type ComposeInputObjectTypeConfig = {
    name: string,
    fields: Thunk<ComposeInputFieldConfigMap>,
    description?: string | null,
};

export default class InputTypeComposer {
    public gqType: GraphQLInputObjectType;

    public constructor(gqType: GraphQLInputObjectType);

    public static create(opts: TypeDefinitionString |
        TypeNameString |
        ComposeInputObjectTypeConfig |
        GraphQLInputObjectType): InputTypeComposer;

    /**
     * Get fields from a GraphQL type
     * WARNING: this method read an internal GraphQL instance variable.
     */
    public getFields(): GraphQLInputFieldConfigMap;

    public getFieldNames(): string[];

    public hasField(fieldName: string): boolean;

    /**
     * Completely replace all fields in GraphQL type
     * WARNING: this method rewrite an internal GraphQL instance variable.
     */
    public setFields(fields: ComposeInputFieldConfigMap): this;

    public setField(fieldName: string, fieldConfig: ComposeInputFieldConfig): this;

    /**
     * Add new fields or replace existed in a GraphQL type
     */
    public addFields(newFields: ComposeInputFieldConfigMap): this;

    /**
     * Get fieldConfig by name
     */
    public getField(fieldName: string): GraphQLInputFieldConfig;

    public removeField(fieldNameOrArray: string | string[]): this;

    public removeOtherFields(fieldNameOrArray: string | string[]): this;

    public extendField(fieldName: string, parialFieldConfig: ComposeInputFieldConfig): this;

    public reorderFields(names: string[]): this;

    public isRequired(fieldName: string): boolean;

    public getFieldTC(fieldName: string): InputTypeComposer;

    public makeRequired(fieldNameOrArray: string | string[]): this;

    public makeOptional(fieldNameOrArray: string | string[]): this;

    public clone(newTypeName: string): InputTypeComposer;

    public getType(): GraphQLInputObjectType;

    public getTypeAsRequired(): GraphQLNonNull<GraphQLInputObjectType>;

    public getTypeName(): string;

    public setTypeName(name: string): this;

    public getDescription(): string;

    public setDescription(description: string): this;

    public get(path: string | string[]): any;
}
