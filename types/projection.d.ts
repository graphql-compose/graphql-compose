import { FieldNode, FragmentDefinitionNode, GraphQLResolveInfo, InlineFragmentNode } from './graphql';
import { ProjectionType } from './resolver';

export function getProjectionFromAST(
    context: GraphQLResolveInfo,
    fieldNode?: FieldNode | InlineFragmentNode | FragmentDefinitionNode): ProjectionType;

export function getFlatProjectionFromAST(
    context: GraphQLResolveInfo,
    fieldNodes?: FieldNode | InlineFragmentNode | FragmentDefinitionNode): { [key: string]: boolean };
