import {
    GraphQLArgumentConfig, GraphQLFieldConfig, GraphQLFieldConfigArgumentMap, GraphQLFieldConfigMap,
    GraphQLInputFieldConfig, GraphQLInputFieldConfigMap, GraphQLNamedType, GraphQLType, DocumentNode
} from './graphql';
import {
    ComposeArgumentConfig, ComposeFieldConfig, ComposeFieldConfigArgumentMap,
    ComposeFieldConfigMap
} from './TypeComposer';
import { TypeDefinitionString, TypeNameString, TypeWrappedString } from './TypeMapper';
import { ComposeInputFieldConfig, ComposeInputFieldConfigMap } from './InputTypeComposer';
import { TypeStorage } from './TypeStorage';
import { Thunk } from './utils/definitions';

export type TypeDefinitionString = string; // eg. type Name { field: Int }
export type TypeWrappedString = string; // eg. Int, Int!, [Int]
export type TypeNameString = string; // eg. Int, Float
export type TypeAsString = TypeDefinitionString | TypeWrappedString | TypeNameString;

declare class TypeMapper {
    public basicScalars: Map<string, GraphQLNamedType>;

    public constructor();

    public get(name: string): GraphQLNamedType | null;

    public set(name: string, type: GraphQLNamedType): void;

    public has(name: string): boolean;

    public getWrapped(str: TypeWrappedString | TypeNameString): GraphQLType | null;

    public createType(str: TypeDefinitionString): GraphQLNamedType | null;

    public parseTypesFromString(str: string): TypeStorage<GraphQLNamedType>;

    public parseTypesFromAst(astDocument: DocumentNode): TypeStorage<GraphQLNamedType>;

    public convertOutputFieldConfig<TSource, TContext>(
        composeFC: ComposeFieldConfig<TSource, TContext>,
        fieldName?: string,
        typeName?: string): GraphQLFieldConfig<TSource, TContext>;

    public convertOutputFieldConfigMap<TSource, TContext>(
        composeFields: ComposeFieldConfigMap<TSource, TContext> | GraphQLFieldConfigMap<TSource, TContext>,
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
