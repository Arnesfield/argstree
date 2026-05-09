/**
 * Checks if an object has values.
 * @param o The object to check.
 * @returns `true` if the object has values.
 */
export function hasValues(
  o: Record<string, unknown> | null | undefined
): true | undefined {
  for (const k in o) if (Object.hasOwn(o, k) && o[k] != null) return true;
}
