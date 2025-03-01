import { Options } from '../core/core.types.js';
import { isOptionType } from './arg.utils.js';

export interface NameOptions {
  /** The parsed key from the argument. */
  key?: string | null;
  options: Options;
}

export function display(data: NameOptions): string {
  const name = data.options.name ?? data.key;
  return name == null
    ? ''
    : (isOptionType(data.options.type, data.key) ? 'Option' : 'Command') +
        ` '${name}' `;
}
