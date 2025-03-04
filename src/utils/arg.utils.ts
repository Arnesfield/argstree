import { Options } from '../core/core.types.js';

/**
 * Determines if the argument looks like an alias (e.g. `-o`, `-op`).
 * @param arg The argument to check.
 * @returns `true` if the argument is an alias.
 */
export function isAlias(arg: string): boolean {
  return arg.length > 1 && arg[0] === '-' && arg[1] !== '-';
}

/**
 * Determines if the argument looks like an option
 * (e.g. `-o`, `-op`, `--o`, `--option`).
 * @param arg The argument to check.
 * @returns `true` if {@linkcode arg} is an option.
 */
export function isOption(arg: string): boolean {
  // also works with 3 hyphens `---`
  return arg[0] === '-' && arg.length > (arg[1] === '-' ? 2 : 1);
}

// NOTE: internal

export function isOptionType(
  arg: string | null,
  options: Pick<Options, 'type'>
): boolean {
  // follow type if it's explicitly set, otherwise infer the type from arg
  return (
    options.type === 'option' ||
    (options.type !== 'command' && !!arg && isOption(arg))
  );
}
