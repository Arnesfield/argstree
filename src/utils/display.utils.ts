import { Options } from '../core/core.types.js';
import { isOptionType } from './arg.utils.js';

export interface DisplayOptions {
  /** The parsed key from the argument. */
  key?: string | null;
  options: Options;
}

export function display(opts: DisplayOptions): string {
  const name = opts.options.name ?? opts.key;
  return name == null
    ? ''
    : (opts.key && isOptionType(opts.key, opts.options)
        ? 'Option'
        : 'Command') + ` '${name}' `;
}
