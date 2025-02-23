import { Options } from '../core/core.types.js';

export function isAlias(arg: string): boolean {
  return arg.length > 1 && arg[0] === '-' && arg[1] !== '-';
}

export function isOption(arg: string): boolean {
  return arg[0] === '-' && arg.length > (arg[1] === '-' ? 2 : 1);
}

export function isAssignable(arg: string, options: Options | true): boolean {
  return typeof options === 'object'
    ? (options.assign ??
        (options.type ? options.type !== 'command' : isOption(arg)))
    : isOption(arg);
}
