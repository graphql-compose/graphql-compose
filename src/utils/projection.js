/* @flow strict */
/* eslint-disable no-param-reassign, no-lonely-if */

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
import deepmerge from './deepmerge';

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

  const queryProjection = getProjectionFromASTquery(info, fieldNode);
  const queryExtProjection = extendByFieldProjection(info.returnType, queryProjection);
  return queryExtProjection;
}

export function getProjectionFromASTquery(
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
    (res, ast: FieldNode | InlineFragmentNode | FragmentSpreadNode) => {
      switch (ast.kind) {
        case FIELD: {
          const { value } = ast.name;
          if (res[value]) {
            res[value] = deepmerge(res[value], getProjectionFromASTquery(info, ast) || true);
          } else {
            res[value] = getProjectionFromASTquery(info, ast) || true;
          }
          return res;
        }
        case INLINE_FRAGMENT:
          return deepmerge(res, getProjectionFromASTquery(info, ast));
        case FRAGMENT_SPREAD:
          return deepmerge(res, getProjectionFromASTquery(info, info.fragments[ast.name.value]));
        default:
          throw new Error('Unsuported query selection');
      }
    },
    {}
  );

  return projection;
}

export function getFlatProjectionFromAST(
  info: GraphQLResolveInfo,
  fieldNodes?: FieldNode | InlineFragmentNode | FragmentDefinitionNode
) {
  const projection = getProjectionFromAST(info, fieldNodes) || {};
  const flatProjection = {};
  Object.keys(projection).forEach(key => {
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
  Object.keys(proj).forEach(key => {
    const field = (type: any)._fields[key];
    if (!field) return;

    if (field.projection) proj = deepmerge(proj, field.projection);
    if (field.extensions && field.extensions.projection) {
      proj = deepmerge(proj, field.extensions.projection);
    }
    proj[key] = extendByFieldProjection((field.type: any), proj[key]);
  });

  return proj;
}
