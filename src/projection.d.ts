import { FieldNode, FragmentDefinitionNode, GraphQLResolveInfo, InlineFragmentNode } from './graphql';

export type ProjectionType = { [fieldName: string]: any };
export type ProjectionNode = { [fieldName: string]: any };
export type ProjectionMapType = { [relationfieldName: string]: ProjectionType };

export function getProjectionFromAST(
    context: GraphQLResolveInfo,
    fieldNode?: FieldNode | InlineFragmentNode | FragmentDefinitionNode): ProjectionType;

export function getFlatProjectionFromAST(
    context: GraphQLResolveInfo,
    fieldNodes?: FieldNode | InlineFragmentNode | FragmentDefinitionNode): { [key: string]: boolean };
