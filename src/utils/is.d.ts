export function isString(value: string | null): value is string;

export function isObject(value: object | null): boolean;

// tslint:disable-next-line:ban-types
export function isFunction(value: Function | null): value is Function;
