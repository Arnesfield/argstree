export function deproto<T extends Record<keyof any, any>>(): Partial<T>;
export function deproto<T extends Record<keyof any, any>>(obj: T): T;
export function deproto<T extends Record<keyof any, any>>(obj?: T): Partial<T>;
export function deproto<T extends Record<keyof any, any>>(obj?: T): T {
  return obj ? { __proto__: null, ...obj } : Object.create(null);
}
