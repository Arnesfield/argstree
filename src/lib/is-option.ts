/**
 * Determines if the argument looks like an option. By default,
 * both `long` (e.g. `--option`) and `short` (e.g. `-a`, `-abc`) options
 * are valid unless the specific type of option is provided.
 * @param arg The argument to check.
 * @param type The option type.
 * @returns `true` if the argument looks like an option.
 */
export function isOption(arg: string, type?: 'long' | 'short'): boolean {
  // fallback cases are for the opposite condition and no provided type
  const min = type === 'long' ? 2 : 1;
  // for short options, stop checking at length 2
  const max = type === 'short' ? Math.min(2, arg.length) : arg.length;

  // this is probably faster than a regexp?
  for (let i = 0; i < max; i++) {
    // before min, dashes must exist
    // after min, a non-dash should exist before reaching max
    if (arg[i] !== '-') return i >= min;
  }
  return false;
}
