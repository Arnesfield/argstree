// NOTE: internal

/** @see https://www.totaltypescript.com/concepts/the-prettify-helper */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};

/** An array with at least one element (prettified). */
export type NonEmptyArray<T> = Prettify<[T, ...T[]]>;
