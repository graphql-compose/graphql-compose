import { ScalarTypeComposer } from '../ScalarTypeComposer';
import { EnumTypeComposer } from '../EnumTypeComposer';
import { InterfaceTypeComposer } from '../InterfaceTypeComposer';
import { InputTypeComposer } from '../InputTypeComposer';
import { ObjectTypeComposer } from '../ObjectTypeComposer';
import { UnionTypeComposer } from '../UnionTypeComposer';
import { NamedTypeComposer } from './typeHelpers';
import { SchemaFilterTypes } from './getFromSchema';

export type CompareTypeComposersResult = -1 | 0 | 1;

export type CompareTypeComposersFn = (
  tc1: NamedTypeComposer<any>,
  tc2: NamedTypeComposer<any>,
) => CompareTypeComposersResult;

export type CompareTypeComposersOption =
  | boolean
  | 'ALPHABETIC'
  | 'GROUP_BY_TYPE'
  | CompareTypeComposersFn;

const rootOrderDefault = [
  'Query',
  'Mutation',
  'Subscription',
];

function numberToCompareResult(n: number): CompareTypeComposersResult {
  return n < 0 ? -1
    : n > 0 ? 1
    : 0;
}

export function printSortAlpha(
  tc1: NamedTypeComposer<any>,
  tc2: NamedTypeComposer<any>,
): CompareTypeComposersResult {
  return numberToCompareResult(
    tc1.getTypeName().localeCompare(tc2.getTypeName())
  );
}

function sortGetPositionFromArray(
  tc: NamedTypeComposer<any>,
  orderArray: string[],
): number {
  const order = orderArray.indexOf(tc.getTypeName());
  return order === -1 ? Infinity : order;
}

function sortGetPositionOfType(
  tc: NamedTypeComposer<any>,
  rootTypes: string[] = [],
): number[] {
  switch (true) {
    case tc instanceof ScalarTypeComposer: return [2];
    case tc instanceof EnumTypeComposer: return [3];
    case tc instanceof UnionTypeComposer: return [4];
    case tc instanceof InterfaceTypeComposer: return [5];
    case tc instanceof ObjectTypeComposer:
      const isRoot = rootTypes.includes(tc.getTypeName());
      if (isRoot) {
        return [1, sortGetPositionFromArray(tc, rootTypes)];
      } else {
        return [6];
      }
    case tc instanceof InputTypeComposer: return [7];
  }
  throw new Error(`Unknown kind of type ${tc.getTypeName()}`);
}

function comparePositionLists(
  p1: number[],
  p2: number[],
): CompareTypeComposersResult {
  let common = Math.min(p1.length, p2.length);
  for (let i = 0; i < common; i++) {
    if (p1[i] < p2[i]) return -1;
    if (p1[i] > p2[i]) return +1;
  }
  return 0;
}

export function fnPrintSortByType(
  opt?: SchemaFilterTypes,
): CompareTypeComposersFn {
  const rootTypes = opt?.include || rootOrderDefault;
  return function (
    tc1: NamedTypeComposer<any>,
    tc2: NamedTypeComposer<any>,
  ): CompareTypeComposersResult {
    const pos1 = sortGetPositionOfType(tc1, rootTypes);
    const pos2 = sortGetPositionOfType(tc2, rootTypes);
    const diff = comparePositionLists(pos1, pos2);
    return diff || printSortAlpha(tc1, tc2);
  }
}

export function getSortMethodFromOption(
  sortOption?: CompareTypeComposersOption,
  printFilter?: SchemaFilterTypes,
): CompareTypeComposersFn | undefined {
  switch (sortOption) {
    case null:
    case undefined:
    case false:
      return;
    case true:
    case 'ALPHABETIC':
      return printSortAlpha;
    case 'GROUP_BY_TYPE':
      return fnPrintSortByType(printFilter);
    default:
      return sortOption;
  }
}
