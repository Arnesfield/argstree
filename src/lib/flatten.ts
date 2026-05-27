import { Node } from '../types/node.types';
import { __assertNotNull } from '../utils/assert';

/**
 * Flattens the node tree structure into an array of nodes.
 * @param node The root node of the tree.
 * @returns The nodes from the tree.
 */
export function flatten<T>(node: Node<T>): Node<T>[];
export function flatten<T>(node: Node<T> | undefined): Node<T>[] {
  __assertNotNull(node);

  const nodes: Node<T>[] = [],
    stack = [node];

  while ((node = stack.pop())) {
    nodes.push(node);
    for (let c = node.children, i = c.length; i-- > 0; ) stack.push(c[i]);
  }

  return nodes;
}
