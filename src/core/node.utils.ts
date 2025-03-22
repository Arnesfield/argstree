import { Node } from '../types/node.types.js';

/**
 * Get the ancestor nodes of the provided node
 * starting from the parent node to the root node.
 * @param node The node to process.
 * @returns The ancestor nodes.
 */
export function getAncestors(node: Node): Node[] {
  const nodes: Node[] = [];
  for (let curr: Node | null = node; (curr = curr.parent); ) nodes.push(curr);
  return nodes;
}

/**
 * Get the descendant nodes of the provided node.
 * Child nodes are located beside their parent node.
 *
 * e.g. `child0`, `...child0.children`, `child1`, `...child1.children`, etc.
 * @param node The node to process.
 * @returns The descendant nodes
 */
export function getDescendants(node: Node): Node[] {
  const nodes: Node[] = [];
  const stack: Node[] = [];

  for (let curr: Node | undefined = node; curr; ) {
    // push child nodes to stack in reverse to process the last node first
    for (let i = curr.children.length - 1; i >= 0; i--) {
      stack.push(curr.children[i]);
    }
    // save last node
    if ((curr = stack.pop())) nodes.push(curr);
  }

  return nodes;
}
