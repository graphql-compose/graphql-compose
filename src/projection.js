/* eslint-disable no-param-reassign */

export function getProjectionFromAST(context, fieldNodes)/* :ProjectionType */ {
  if (!context) {
    return null;
  }

  let asts = fieldNodes || context.fieldNodes || context.fieldASTs;
  if (!Array.isArray(asts)) {
    asts = [asts];
  }

  // get all selectionSets
  const selections = asts.reduce((result, source) => {
    if (source.selectionSet) {
      result.push(...source.selectionSet.selections);
    }

    return result;
  }, []);

  const projection = selections.reduce((list, ast) => {
    const { name, kind } = ast;

    switch (kind) {
      case 'Field':
        list = list || {};
        list[name.value] = getProjectionFromAST(context, ast) || true;
        return list;
      case 'InlineFragment':
        return {
          ...list,
          ...getProjectionFromAST(context, ast),
        };
      case 'FragmentSpread':
        return {
          ...list,
          ...getProjectionFromAST(context, context.fragments[name.value]),
        };
      default:
        throw new Error('Unsuported query selection');
    }
  }, null);

  // this type params are setup via TypeComposer.addProjectionMapper()
  // Sometimes, when you create relations you need query additional fields, that not in query.
  // Eg. for obtaining `friendList` you also should add `friendIds` to projection.
  if (projection && context.returnType) {
    let returnType = context.returnType;
    while (returnType.ofType) {
      returnType = returnType.ofType;
    }
    if (typeof returnType._gqcProjectionMapper === 'object') {
      Object.keys(returnType._gqcProjectionMapper).forEach(key => {
        if (projection[key]) {
          Object.assign(projection, returnType._gqcProjectionMapper[key]);
        }
      });
    }
  }
  return projection;
}

export function getFlatProjectionFromAST(context, fieldNodes) {
  const projection = getProjectionFromAST(context, fieldNodes);
  const flatProjection = {};
  Object.keys(projection).forEach(key => {
    flatProjection[key] = !!projection[key];
  });
  return flatProjection;
}
