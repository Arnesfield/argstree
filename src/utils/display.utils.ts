import { NodeData, Options } from '../core/core.types.js';
import { isOptionType } from './arg.utils.js';

export function display(opts: Pick<NodeData, 'key' | 'options'>): string {
  const name = opts.options.name ?? opts.key;
  return name == null
    ? ''
    : (opts.key && isOptionType(opts.key, opts.options)
        ? 'Option'
        : 'Command') + ` '${name}' `;
}
