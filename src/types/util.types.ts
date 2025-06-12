// NOTE: internal

/** @see https://www.totaltypescript.com/concepts/the-prettify-helper */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};

/** An array with at least one element (prettified). */
export type NonEmptyArray<T> = Prettify<[T, ...T[]]>;

/** Removes the `readonly` modifier. */
export type Mutable<T> = { -readonly [P in keyof T]: T[P] };

export type PartialPick<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

// NOTE: taken from https://github.com/microsoft/TypeScript/issues/14094#issuecomment-373782604
export type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
export type XOR<T, U> = T | U extends object
  ? (Without<T, U> & U) | (Without<U, T> & T)
  : T | U;
