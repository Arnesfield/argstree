import { NodeData } from '../core/core.types.js';

export function display(
  opts: Pick<NodeData, 'type' | 'key' | 'options'>
): string {
  const name = opts.options.name ?? opts.key;
  return name == null
    ? ''
    : (opts.type === 'option' ? 'Option' : 'Command') + ` '${name}' `;
}
