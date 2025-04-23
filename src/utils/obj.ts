// NOTE: internal

/**
 * Creates a shallow copy of an object with `null` prototype.
 * @param o The object to copy.
 * @returns The shallow copy of the object.
 */
export function obj<T extends Record<string, unknown>>(o?: T): T {
  return { __proto__: null, ...o } as unknown as T;
}
