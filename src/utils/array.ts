/**
 * Ensures the value is an array.
 * Returns an empty array if the value is `null` or `undefined`.
 * @param a The value or array.
 * @returns The array.
 */
export function array<T>(a: T | T[] | null | undefined): T[] {
  return Array.isArray(a) ? a : a != null ? [a] : [];
}

/**
 * Gets the length of the value if it's an array.
 * Returns `1` if the value is not `null` or `undefined`,
 * otherwise it returns `0`.
 * @param a The value or array.
 * @returns The size of the value.
 */
export function size<T>(a: T | T[] | null | undefined): number {
  return Array.isArray(a) ? a.length : a != null ? 1 : 0;
}
