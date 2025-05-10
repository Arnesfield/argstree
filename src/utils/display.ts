import { Node } from '../types/node.types';

// NOTE: internal

export function display<T>(node: Pick<Node<T>, 'name' | 'type'>): string {
  return node.name == null
    ? ''
    : (node.type === 'option' ? 'Option' : 'Command') + ` '${node.name}' `;
}
