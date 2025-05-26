import { NodeData } from '../parser/cnode';

// NOTE: internal

export function display<T>(node: Pick<NodeData<T>, 'name' | 'type'>): string {
  return node.name == null
    ? ''
    : (node.type === 'option' ? 'Option' : 'Command') + ` '${node.name}' `;
}
