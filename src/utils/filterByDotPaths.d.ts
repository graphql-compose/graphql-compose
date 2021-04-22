export interface FilterOpts {
  hideFields: { [fieldPath: string]: string };
  hideFieldsNote?: string;
}

export type PathsFilter = string | string[];

export function filterByDotPaths(
  obj: Record<string, unknown>,
  pathsFilter: PathsFilter | null,
  opts?: FilterOpts
): Record<string, unknown>;

export function preparePathsFilter(pathsFilter?: PathsFilter | null): string[] | null;

export function isPresentInDotFilter(name: string, pathsFilter: string | string[] | null): boolean;

export function hideComplexValue(val: any, msg?: string): string;

export function partialCloneSubpath(res: any, path: string[]): void;

export function hideField(
  result: Record<string, unknown>,
  key: string,
  msg?: string,
  pathsFilter?: PathsFilter
): string[];
