/**
 * Checks if an object has values.
 * Note that this assumes that the object has `null` prototype.
 * @param o The object to check.
 * @returns `true` if the object has values.
 */
export function hasValues<
  // assume only object values since this is used exclusively for that
  T extends { [key: string]: object | null | undefined }
>(
  o: T | null | undefined
  // @ts-expect-error Allow `undefined` return value.
): o is T {
  for (const k in o) if (o[k]) return true;
}
