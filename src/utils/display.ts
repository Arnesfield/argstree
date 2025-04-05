import { Node } from '../types/node.types.js';

export function display(node: Node): string {
  return node.name == null
    ? ''
    : (node.type === 'option' ? 'Option' : 'Command') + ` '${node.name}' `;
}
