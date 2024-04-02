export function has<T extends Record<keyof any, any>>(
  obj: T,
  prop: keyof T
): boolean {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

export function isObject<T>(obj: T | null | undefined): obj is T {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    obj !== Object.prototype &&
    !Array.isArray(obj)
  );
}
