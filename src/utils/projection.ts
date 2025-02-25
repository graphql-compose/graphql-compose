import type {
  FieldNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  InlineFragmentNode,
  GraphQLResolveInfo,
  GraphQLOutputType,
} from '../graphql';
import {
  Kind,
  GraphQLObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInterfaceType,
} from '../graphql';
import { deepmerge } from './deepmerge';

const { FIELD, FRAGMENT_SPREAD, INLINE_FRAGMENT } = Kind;

// export type ProjectionType = { [fieldName: string]: $Shape<ProjectionNode> | true };
// export type ProjectionNode = { [fieldName: string]: $Shape<ProjectionNode> } | true;
export type ProjectionType = { [fieldName: string]: any };
export type ProjectionNode = { [fieldName: string]: any };

export function getProjectionFromAST(
  info: GraphQLResolveInfo,
  fieldNode?: FieldNode | InlineFragmentNode | FragmentDefinitionNode
): ProjectionType {
  if (!info) {
    return {};
  }

  const queryProjection = getProjectionFromASTQuery(info, fieldNode);
  const queryExtProjection = extendByFieldProjection(info.returnType, queryProjection);
  return queryExtProjection;
}

export function getProjectionFromASTQuery(
  info: GraphQLResolveInfo,
  fieldNode?: FieldNode | InlineFragmentNode | FragmentDefinitionNode
): ProjectionType {
  if (!info) {
    return {};
  }

  let selections; // Array<FieldNode | InlineFragmentNode | FragmentSpreadNode>;
  if (fieldNode) {
    if (fieldNode.selectionSet) {
      selections = fieldNode.selectionSet.selections;
    }
  } else if (Array.isArray(info.fieldNodes)) {
    // get all selectionSets
    selections = info.fieldNodes.reduce((result, source) => {
      if (source.selectionSet) {
        result.push(...source.selectionSet.selections);
      }
      return result;
    }, []);
  }

  const projection = (selections || []).reduce(
    (res: Record<any, any>, ast: FieldNode | InlineFragmentNode | FragmentSpreadNode) => {
      switch (ast.kind) {
        case FIELD: {
          const { value } = ast.name;
          if (res[value]) {
            res[value] = deepmerge(res[value], getProjectionFromASTQuery(info, ast) || true);
          } else {
            res[value] = getProjectionFromASTQuery(info, ast) || true;
          }
          return res;
        }
        case INLINE_FRAGMENT:
          return deepmerge(res, getProjectionFromASTQuery(info, ast));
        case FRAGMENT_SPREAD:
          return deepmerge(res, getProjectionFromASTQuery(info, info.fragments[ast.name.value]));
        default:
          throw new Error('Unsupported query selection');
      }
    },
    {}
  );

  return projection;
}
// export old getProjectionFromASTquery to be removed in next major release
export const getProjectionFromASTquery = getProjectionFromASTQuery;

export function getFlatProjectionFromAST(
  info: GraphQLResolveInfo,
  fieldNodes?: FieldNode | InlineFragmentNode | FragmentDefinitionNode
): Record<any, any> {
  const projection = getProjectionFromAST(info, fieldNodes) || {};
  const flatProjection = {} as Record<any, any>;
  Object.keys(projection).forEach((key) => {
    flatProjection[key] = !!projection[key];
  });
  return flatProjection;
}

// This method traverse fields and extends current projection
// by projection from fields
export function extendByFieldProjection(
  returnType: GraphQLOutputType,
  projection: ProjectionType
): ProjectionType {
  let type: GraphQLOutputType = returnType;

  while (type instanceof GraphQLList || type instanceof GraphQLNonNull) {
    type = type.ofType;
  }

  if (!(type instanceof GraphQLObjectType || type instanceof GraphQLInterfaceType)) {
    return projection;
  }

  let proj = projection;
  Object.keys(proj).forEach((key) => {
    const field = (type as any).getFields()[key];
    if (!field) return;

    if (field.projection) proj = deepmerge(proj, field.projection);
    if (field.extensions && field.extensions.projection) {
      proj = deepmerge(proj, field.extensions.projection);
    }
    proj[key] = extendByFieldProjection(field.type as any, proj[key]);
  });

  return proj;
}
