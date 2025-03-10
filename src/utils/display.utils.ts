import { NodeData, Options } from '../core/core.types.js';

export interface DisplayOptions extends Pick<NodeData, 'type' | 'key'> {
  options: Pick<Options, 'name'>;
}

export function display(opts: DisplayOptions): string {
  const name = opts.options.name ?? opts.key;
  return name == null
    ? ''
    : (opts.type === 'option' ? 'Option' : 'Command') + ` '${name}' `;
}
