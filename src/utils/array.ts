/**
 * Ensures the value is a string array.
 * @param a The string or string array.
 * @param keep Determines if the original array should be kept or copied.
 * @returns The string array.
 */
export function array<T>(a: T | T[] | null | undefined, keep?: boolean): T[] {
  return typeof a === 'string'
    ? [a]
    : Array.isArray(a)
      ? keep
        ? a
        : a.slice()
      : [];
}
