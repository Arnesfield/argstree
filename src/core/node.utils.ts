import { Node } from '../types/node.types.js';

/**
 * Gets the ancestor nodes of the provided node
 * starting from the parent node to the root node.
 * @param node The node to process.
 * @returns The ancestor nodes.
 */
export function getAncestors(node: Node): Node[];
export function getAncestors(node: Node | null): Node[] {
  const nodes: Node[] = [];
  while ((node = node!.parent)) nodes.push(node);
  return nodes;
}

/**
 * Gets the descendant nodes of the provided node.
 * @param node The node to process.
 * @returns The descendant nodes
 */
export function getDescendants(node: Node): Node[] {
  // it is unlikely that a node with children is in between infertile nodes
  // the order of nodes will be wrong in the unlikely event that it happens
  const nodes = node.children.slice();
  for (let i = 0; i < nodes.length; i++) {
    for (const child of nodes[i].children) {
      nodes.push(child);
    }
  }
  return nodes;
}
