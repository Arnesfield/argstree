import { Options } from '../core/core.types.js';

export function isAlias(arg: string): boolean {
  return arg.length >= 2 && arg[0] === '-' && arg[1] !== '-';
}

export function isOption(arg: string): boolean {
  return arg.length >= 3 && arg.startsWith('--');
}

export function isAssignable(
  arg: string,
  options: Pick<Options, 'assign'>
): boolean {
  return options.assign ?? (isAlias(arg) || isOption(arg));
}
