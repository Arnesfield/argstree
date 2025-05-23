import { Node } from '../types/node.types';

/**
 * Flattens the node tree structure into an array of nodes.
 * @template T The metadata type.
 * @param node The root node of the tree.
 * @returns The nodes from the tree.
 */
export function flatten<T>(node: Node<T>): Node<T>[] {
  // it is unlikely that a node with children is in between infertile nodes
  // the order of nodes will be different in the unlikely event that it happens
  const nodes = [node];
  for (node of nodes) nodes.push(...node.children);
  return nodes;
}
