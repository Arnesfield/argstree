import { Options } from '../core/core.types.js';

export function isAlias(arg: string): boolean {
  return arg.length > 1 && arg[0] === '-' && arg[1] !== '-';
}

export function isOption(arg: string): boolean {
  return arg[0] === '-' && arg.length > (arg[1] === '-' ? 2 : 1);
}

export function isOptionType(arg: string, options: Options): boolean {
  return options.type ? options.type !== 'command' : isOption(arg);
}
