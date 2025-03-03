import { NodeData, Options } from '../core/core.types.js';
import { isOptionType } from './arg.utils.js';

export interface DisplayOptions extends Pick<NodeData, 'key'> {
  options: Pick<Options, 'name' | 'type'>;
}

export function display(opts: DisplayOptions): string {
  const name = opts.options.name ?? opts.key;
  return name == null
    ? ''
    : (isOptionType(opts.key, opts.options) ? 'Option' : 'Command') +
        ` '${name}' `;
}
