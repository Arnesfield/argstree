export function isObject<T>(obj: T | null | undefined): obj is T {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    obj !== Object.prototype &&
    !Array.isArray(obj)
  );
}
