// TODO: remove unused
export function has<T extends Record<keyof unknown, unknown>>(
  obj: T,
  prop: keyof T
): prop is keyof T {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

// TODO: remove unused
export function obj<T extends Record<keyof unknown, unknown>>(value?: T): T {
  // create and assign value to object with no prototype
  return Object.assign(Object.create(null) as T, value);
}
