/* @flow */
/* eslint-disable no-param-reassign, no-lonely-if */

import type {
  FieldNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  InlineFragmentNode,
} from 'graphql/language/ast';
import type { GraphQLResolveInfo } from 'graphql/type/definition';
import { FIELD, FRAGMENT_SPREAD, INLINE_FRAGMENT } from 'graphql/language/kinds';
import type { ProjectionType } from './resolver';

export function getProjectionFromAST(
  context: GraphQLResolveInfo,
  fieldNode?: FieldNode | InlineFragmentNode | FragmentDefinitionNode
): ProjectionType {
  if (!context) {
    return {};
  }

  let selections; // Array<FieldNode | InlineFragmentNode | FragmentSpreadNode>;
  if (fieldNode) {
    if (fieldNode.selectionSet) {
      selections = fieldNode.selectionSet.selections;
    }
  } else if (Array.isArray(context.fieldNodes)) {
    // get all selectionSets
    selections = context.fieldNodes.reduce((result, source) => {
      if (source.selectionSet) {
        result.push(...source.selectionSet.selections);
      }
      return result;
    }, []);
  }

  const projection = (selections || []
  ).reduce((list, ast: FieldNode | InlineFragmentNode | FragmentSpreadNode) => {
    switch (ast.kind) {
      case FIELD:
        list[ast.name.value] = getProjectionFromAST(context, ast) || true;
        return list;
      case INLINE_FRAGMENT:
        return {
          ...list,
          ...getProjectionFromAST(context, ast),
        };
      case FRAGMENT_SPREAD:
        return {
          ...list,
          ...getProjectionFromAST(context, context.fragments[ast.name.value]),
        };
      default:
        throw new Error('Unsuported query selection');
    }
  }, {});

  // this type params are setup via TypeComposer.addProjectionMapper()
  // Sometimes, when you create relations you need query additional fields, that not in query.
  // Eg. for obtaining `friendList` you also should add `friendIds` to projection.
  if (projection && context.returnType) {
    let returnType = context.returnType;
    while (returnType.ofType) {
      returnType = returnType.ofType;
    }

    // $FlowFixMe
    const mapper = returnType._gqcProjectionMapper;
    if (mapper && typeof mapper === 'object') {
      Object.keys(mapper).forEach(key => {
        if (projection[key]) {
          Object.assign(projection, mapper[key]);
        }
      });
    }
  }
  return projection;
}

export function getFlatProjectionFromAST(
  context: GraphQLResolveInfo,
  fieldNodes?: FieldNode | InlineFragmentNode | FragmentDefinitionNode
) {
  const projection = getProjectionFromAST(context, fieldNodes) || {};
  const flatProjection = {};
  Object.keys(projection).forEach(key => {
    flatProjection[key] = !!projection[key];
  });
  return flatProjection;
}
