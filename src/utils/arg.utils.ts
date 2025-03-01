import { Options } from '../core/core.types.js';

export function isAlias(arg: string): boolean {
  return arg.length > 1 && arg[0] === '-' && arg[1] !== '-';
}

export function isOption(arg: string): boolean {
  return arg[0] === '-' && arg.length > (arg[1] === '-' ? 2 : 1);
}

export function isOptionType(
  type: Options['type'],
  arg: string | null | undefined
): boolean {
  return type ? type !== 'command' : !!arg && isOption(arg);
}

export function isAssignable(arg: string, options: Options | true): boolean {
  return typeof options === 'object'
    ? (options.assign ?? isOptionType(options.type, arg))
    : isOption(arg);
}
