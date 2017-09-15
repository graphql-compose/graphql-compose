import {
    GraphQLArgumentConfig, GraphQLFieldConfig, GraphQLFieldConfigArgumentMap, GraphQLFieldConfigMap,
    GraphQLInputFieldConfig, GraphQLInputFieldConfigMap, GraphQLNamedType, GraphQLType
} from './graphql';
import {
    ComposeArgumentConfig, ComposeFieldConfig, ComposeFieldConfigArgumentMap,
    ComposeFieldConfigMap
} from './typeComposer';
import { TypeDefinitionString, TypeNameString, TypeWrappedString } from './typeMapper';
import { ComposeInputFieldConfig, ComposeInputFieldConfigMap } from './inputTypeComposer';

export type TypeDefinitionString = string;
export type TypeWrappedString = string; // eg. Int, Int!, [Int]
export type TypeNameString = string; // eg. Int, Float

declare class TypeMapper {
    public map: Map<string, GraphQLNamedType>;

    public constructor();

    public get(name: string): GraphQLNamedType | null;

    public set(name: string, type: GraphQLNamedType): void;

    public has(name: string): boolean;

    public delete(name: string): boolean;

    public keys(): Iterator<string>;

    public addBasicScalarTypes(): void;

    public getWrapped(str: TypeWrappedString | TypeNameString): GraphQLType | null;

    public createType(str: TypeDefinitionString): GraphQLNamedType | null;

    public convertOutputFieldConfig<TSource, TContext>(
        composeFC: ComposeFieldConfig<TSource, TContext>,
        fieldName?: string,
        typeName?: string): GraphQLFieldConfig<TSource, TContext>;

    public convertOutputFieldConfigMap<TSource, TContext>(
        composeFields: ComposeFieldConfigMap<TSource, TContext>,
        typeName?: string): GraphQLFieldConfigMap<TSource, TContext>;

    public convertArgConfig(
        composeAC: ComposeArgumentConfig,
        argName?: string,
        fieldName?: string,
        typeName?: string): GraphQLArgumentConfig;

    public convertArgConfigMap(
        composeArgsConfigMap: ComposeFieldConfigArgumentMap,
        fieldName?: string,
        typeName?: string): GraphQLFieldConfigArgumentMap;

    public convertInputFieldConfig(
        composeIFC: ComposeInputFieldConfig,
        fieldName?: string,
        typeName?: string): GraphQLInputFieldConfig;

    public convertInputFieldConfigMap(
        composeFields: ComposeInputFieldConfigMap,
        typeName?: string): GraphQLInputFieldConfigMap;
}

declare const typeMapper: TypeMapper;

export default typeMapper;
