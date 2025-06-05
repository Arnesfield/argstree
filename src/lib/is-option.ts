/**
 * Determines if the argument looks like an option. By default,
 * both `long` (e.g. `--option`) and `short` (e.g. `-a`, `-abc`) options
 * are valid unless the specific type of option is provided.
 * @param arg The argument to check.
 * @param type The option type.
 * @returns `true` if the argument looks like an option.
 */
export function isOption(arg: string, type?: 'long' | 'short'): boolean {
  // for short options, stop checking at length 2
  const max = type === 'short' ? Math.min(2, arg.length) : arg.length;

  for (let i = 0; i < max; i++) {
    // before min, dashes must exist
    // after min, a non-dash should exist before reaching max
    // condition can be read as: i >= min
    if (arg[i] !== '-') return i > (type === 'long' ? 1 : 0);
  }

  return false;
}
