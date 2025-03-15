export function obj<T extends Record<keyof unknown, unknown>>(val?: T): T {
  // create and assign value to object with no prototype
  return Object.assign(Object.create(null) as T, val);
}
