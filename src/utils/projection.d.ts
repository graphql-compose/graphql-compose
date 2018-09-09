import {
  FieldNode,
  FragmentDefinitionNode,
  GraphQLResolveInfo,
  InlineFragmentNode,
  GraphQLOutputType,
} from 'graphql';

export type ProjectionNode = { [fieldName: string]: any };
export type ProjectionType<TSource = any> = {
  [fieldName in keyof TSource]: any
};

export function getProjectionFromAST(
  context: GraphQLResolveInfo,
  fieldNode?: FieldNode | InlineFragmentNode | FragmentDefinitionNode,
): ProjectionType;

export function getFlatProjectionFromAST(
  context: GraphQLResolveInfo,
  fieldNodes?: FieldNode | InlineFragmentNode | FragmentDefinitionNode,
): { [key: string]: boolean };

export function extendByFieldProjection(
  returnType: GraphQLOutputType,
  projection: ProjectionType,
): ProjectionType;
