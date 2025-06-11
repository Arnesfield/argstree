/**
 * Asserts that {@linkcode value} follows the provided type.
 * @param value The value to assert the type of.
 * @see https://github.com/evanw/esbuild/pull/1898
 */
export function __assertNotNull<T>(
  value: T | null | undefined
): asserts value is T {
  if (process.env.DEBUG && value == null) {
    throw new Error('null assertion failed');
  }
}
