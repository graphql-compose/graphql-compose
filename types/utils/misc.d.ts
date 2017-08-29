export function resolveMaybeThunk<T>(thingOrThunk: T | (() => T)): T;

export function camelCase(str: string): string;

export function getPluralName(name: string): string;

export function upperFirst(str: string): string;

export function clearName(str: string): string;

export function omit(obj: object, keys: string[]): object;

export function only(obj: object, keys: string[]): object;
