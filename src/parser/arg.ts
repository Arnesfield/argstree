import { Arg } from '../types/node.types.js';

export function toArg(raw: string, alias: string | null): Arg {
  const index = raw.lastIndexOf('=');
  const split = index > -1;
  return {
    raw,
    key: split ? raw.slice(0, index) : raw,
    alias,
    value: split ? raw.slice(index + 1) : null
  };
}
