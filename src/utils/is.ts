export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isObject(value: unknown): value is Record<any, any> {
  return typeof value === 'object' && !Array.isArray(value) && value !== null;
}

export function isFunction(value: unknown): value is (...args: any) => any {
  return !!(
    value &&
    (value as any).constructor &&
    (value as any).call &&
    typeof value === 'function' &&
    value.apply
  );
}
