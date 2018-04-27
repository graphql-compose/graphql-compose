import {
    GraphQLInputFieldConfig, GraphQLInputFieldConfigMap, GraphQLInputObjectType,
    GraphQLNonNull, GraphQLList, GraphQLInputType, InputValueDefinitionNode
} from './graphql';
import { Thunk, ObjMap } from './utils/definitions';
import { TypeAsString } from './TypeMapper';
import { EnumTypeComposer } from './EnumTypeComposer';

export type ComposeInputFieldConfigMap = ObjMap<ComposeInputFieldConfig>;

export type ComposeInputFieldConfig =
    | ComposeInputFieldConfigAsObject
    | ComposeInputType
    | (() => ComposeInputFieldConfigAsObject | ComposeInputType);

export type ComposeInputFieldConfigAsObject = {
    type: Thunk<ComposeInputType> | GraphQLInputType,
    defaultValue?: any,
    description?: string | null,
    astNode?: InputValueDefinitionNode | null,
    [key: string]: any,
} & { $call?: void };

export type ComposeInputType =
    | InputTypeComposer
    | EnumTypeComposer
    | GraphQLInputType
    | TypeAsString
    | Array<InputTypeComposer | EnumTypeComposer | GraphQLInputType | TypeAsString>;

export type ComposeInputObjectTypeConfig = {
    name: string,
    fields: Thunk<ComposeInputFieldConfigMap>,
    description?: string | null,
};

export class InputTypeComposer {
    public gqType: GraphQLInputObjectType;

    public constructor(gqType: GraphQLInputObjectType);

    public static create(opts: TypeAsString |
        ComposeInputObjectTypeConfig |
        GraphQLInputObjectType): InputTypeComposer;

    public static createTemp(opts: TypeAsString |
        ComposeInputObjectTypeConfig |
        GraphQLInputObjectType): InputTypeComposer;

    /**
     * Get fields from a GraphQL type
     * WARNING: this method read an internal GraphQL instance variable.
     */
    public getFields(): ComposeInputFieldConfigMap;

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
    public getField(fieldName: string): ComposeInputFieldConfig;

    public removeField(fieldNameOrArray: string | string[]): this;

    public removeOtherFields(fieldNameOrArray: string | string[]): this;

    public extendField(fieldName: string, parialFieldConfig: ComposeInputFieldConfig): this;

    public reorderFields(names: string[]): this;

    public isFieldNonNull(fieldName: string): boolean ;

    // alias for isFieldNonNull
    public isRequired(fieldName: string): boolean;

    public getFieldConfig(fieldName: string): GraphQLInputFieldConfig;

    public getFieldType(fieldName: string): GraphQLInputType;

    public getFieldTC(fieldName: string): InputTypeComposer;

    public makeFieldNonNull(fieldNameOrArray: string | string[]): this;

    // alias for makeFieldNonNull
    public makeRequired(fieldNameOrArray: string | string[]): this;

    public makeFieldNullable(fieldNameOrArray: string | string[]): this;

    // alias for makeFieldNullable
    public makeOptional(fieldNameOrArray: string | string[]): this;

    public clone(newTypeName: string): InputTypeComposer;

    public getType(): GraphQLInputObjectType;

    public getTypePlural(): GraphQLList<GraphQLInputObjectType>;

    public getTypeNonNull(): GraphQLNonNull<GraphQLInputObjectType>;

    public getTypeName(): string;

    public setTypeName(name: string): this;

    public getDescription(): string;

    public setDescription(description: string): this;

    public get(path: string | string[]): any;
}
