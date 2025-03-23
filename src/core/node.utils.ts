import { Node } from '../types/node.types.js';

/**
 * Get the ancestor nodes of the provided node
 * starting from the parent node to the root node.
 * @param node The node to process.
 * @returns The ancestor nodes.
 */
export function getAncestors(node: Node): Node[];
export function getAncestors(node: Node | null): Node[] {
  const nodes: Node[] = [];
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  while ((node = node!.parent)) nodes.push(node);
  return nodes;
}

/**
 * Get the descendant nodes of the provided node.
 * @param node The node to process.
 * @returns The descendant nodes
 */
export function getDescendants(node: Node): Node[];
export function getDescendants(node: Node | undefined): Node[] {
  const nodes: Node[] = [];
  const stack: Node[] = [];

  while (node) {
    // push child nodes to stack in reverse to process the last node first
    for (let i = node.children.length - 1; i >= 0; i--) {
      stack.push(node.children[i]);
    }
    // save last node
    if ((node = stack.pop())) nodes.push(node);
  }

  return nodes;
}
