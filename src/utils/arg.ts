/**
 * Determines if the argument looks like an alias (e.g. `-o`, `-opt`).
 * @param arg The argument to check.
 * @returns `true` if the argument looks like an alias.
 */
export function isAlias(arg: string): boolean {
  return arg.length > 1 && arg[0] === '-' && arg[1] !== '-';
}

/**
 * Determines if the argument looks like an option
 * (e.g. `-o`, `-opt`, `--o`, `--option`).
 * @param arg The argument to check.
 * @returns `true` if the argument looks like an option.
 */
export function isOption(arg: string): boolean {
  // also works with 3 hyphens `---`
  return arg[0] === '-' && arg.length > (arg[1] === '-' ? 2 : 1);
}
