import { ScalarTypeComposer } from '../ScalarTypeComposer';
import { EnumTypeComposer } from '../EnumTypeComposer';
import { InterfaceTypeComposer } from '../InterfaceTypeComposer';
import { InputTypeComposer } from '../InputTypeComposer';
import { ObjectTypeComposer } from '../ObjectTypeComposer';
import { UnionTypeComposer } from '../UnionTypeComposer';
import { NamedTypeComposer } from './typeHelpers';
import { SchemaFilterTypes } from './getFromSchema';
import { isFunction } from './is';

export type CompareTypeComposersResult = -1 | 0 | 1;

export type CompareTypeComposersFn = (
  tc1: NamedTypeComposer<any>,
  tc2: NamedTypeComposer<any>
) => CompareTypeComposersResult;

export type CompareTypeComposersOption =
  | boolean
  | 'ALPHABETIC'
  | 'GROUP_BY_TYPE'
  | CompareTypeComposersFn;

const rootOrderDefault = ['Query', 'Mutation', 'Subscription'];

export function printSortAlpha(
  tc1: NamedTypeComposer<any>,
  tc2: NamedTypeComposer<any>
): CompareTypeComposersResult {
  const comp = tc1.getTypeName().localeCompare(tc2.getTypeName());
  return comp as CompareTypeComposersResult;
}

function sortGetPositionOfType(tc: NamedTypeComposer<any>, rootTypes: string[] = []): number[] {
  switch (true) {
    case tc instanceof ScalarTypeComposer:
      return [2];
    case tc instanceof EnumTypeComposer:
      return [3];
    case tc instanceof UnionTypeComposer:
      return [4];
    case tc instanceof InterfaceTypeComposer:
      return [5];
    case tc instanceof ObjectTypeComposer:
      const rootPos = rootTypes.indexOf(tc.getTypeName());
      if (rootPos !== -1) {
        return [1, rootPos];
      } else {
        return [6];
      }
    case tc instanceof InputTypeComposer:
      return [7];
  }
  throw new Error(`Unknown kind of type ${tc.getTypeName()}`);
}

function comparePositionLists(p1: number[], p2: number[]): CompareTypeComposersResult {
  const common = Math.min(p1.length, p2.length);
  for (let i = 0; i < common; i++) {
    if (p1[i] < p2[i]) return -1;
    if (p1[i] > p2[i]) return +1;
  }
  return 0;
}

export function fnPrintSortByType(opt?: SchemaFilterTypes): CompareTypeComposersFn {
  const rootTypes = opt?.include || rootOrderDefault;
  return function (
    tc1: NamedTypeComposer<any>,
    tc2: NamedTypeComposer<any>
  ): CompareTypeComposersResult {
    const pos1 = sortGetPositionOfType(tc1, rootTypes);
    const pos2 = sortGetPositionOfType(tc2, rootTypes);
    const diff = comparePositionLists(pos1, pos2);
    return diff || printSortAlpha(tc1, tc2);
  };
}

export function getSortMethodFromOption(
  sortOption?: CompareTypeComposersOption,
  printFilter?: SchemaFilterTypes
): CompareTypeComposersFn | undefined {
  // if null or undefined, default order is alphabetic
  if (
    sortOption === undefined ||
    sortOption === null ||
    sortOption === true ||
    sortOption === 'ALPHABETIC'
  ) {
    return printSortAlpha;
  } else if (sortOption === 'GROUP_BY_TYPE') {
    return fnPrintSortByType(printFilter);
  } else if (isFunction(sortOption)) {
    return sortOption;
  }

  // if (false) or any other value, disable sorting
  return;
}
