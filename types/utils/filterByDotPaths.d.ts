export interface FilterOpts {
    hideFields: { [fieldPath: string]: string };
    hideFieldsNote?: string;
}

export type PathsFilter = string | string[];

export default function filterByDotPaths(obj: object, pathsFilter: PathsFilter|null, opts?: FilterOpts): object;
