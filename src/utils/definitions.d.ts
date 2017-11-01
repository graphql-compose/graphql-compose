export type ObjMap<T> = { [key: string]: T };
export type GenericMap<T> = { [key: string]: T } & { $call?: void };
export type Thunk<T> = (() => T) | T;
