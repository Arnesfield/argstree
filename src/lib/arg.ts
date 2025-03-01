import { Arg } from '../core/core.types.js';

export function toArg(raw: string): Arg {
  const index = raw.lastIndexOf('=');
  const split = index > -1;
  return {
    raw,
    key: split ? raw.slice(0, index) : raw,
    value: split ? raw.slice(index + 1) : null
  };
}
