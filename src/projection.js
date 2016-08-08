/* eslint-disable no-param-reassign */

export function getProjectionFromAST(context, fieldASTs) {
  if (!context) {
    return null;
  }

  let asts = fieldASTs || context.fieldASTs;
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

  return selections.reduce((list, ast) => {
    const { name, kind } = ast;

    switch (kind) {
      case 'Field':
        list = list || {};
        list[name.value] = getProjectionFromAST(context, ast) || true;

        // this type params are setup via TypeComposer.addProjectionMapper()
        // Sometimes, when you create relations you need query additional fields, that not in query.
        // Eg. for obtaining `friendList` you also should add `friendIds` to projection.
        if (context.returnType && typeof context.returnType._gqcProjectionMapper === 'object') {
          Object.keys(context.returnType._gqcProjectionMapper).forEach(key => {
            if (list[key]) {
              Object.assign(list, context.returnType._gqcProjectionMapper[key]);
            }
          });
        }
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
}

export function getFlatProjectionFromAST(context, fieldASTs) {
  const projection = getProjectionFromAST(context, fieldASTs);
  const flatProjection = {};
  Object.keys(projection).forEach(key => {
    flatProjection[key] = !!projection[key];
  });
  return flatProjection;
}
