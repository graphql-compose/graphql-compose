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
