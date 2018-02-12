/* @flow strict */

export type ObjMap<T> = { [key: string]: T, __proto__: null };

// Functions should not match `{[key: string]: any}` type
// So this type allow to use function and object in unions.
// Eg. `a: () => any | {}` will produce following errors
//     Case 1 may work.
//     But if it doesn't, case 2 looks promising too
// But `a: () => any | GenericMap<any>` will work without errors
// https://github.com/facebook/flow/issues/946#issuecomment-250781039
export type GenericMap<T> = { [key: string]: T } & { $call?: void };

export type Thunk<+T> = (() => T) | T;
