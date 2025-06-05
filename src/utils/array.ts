/**
 * Ensures the value is a string array.
 * @param a The string or string array.
 * @param copy Determines if the original array should be copied or not.
 * @returns The string array.
 */
export function array<T>(a: T | T[] | null | undefined, copy?: boolean): T[] {
  return typeof a === 'string'
    ? [a]
    : Array.isArray(a)
      ? copy
        ? a.slice()
        : a
      : [];
}
