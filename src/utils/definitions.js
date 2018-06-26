/* @flow strict */

export type ObjMap<T> = { [key: string]: T, __proto__: null };

export type Thunk<+T> = (() => T) | T;
