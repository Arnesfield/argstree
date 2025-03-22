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
  const stack = [node];

  while (stack.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const curr = stack.pop()!;
    nodes.push(curr);

    for (let i = curr.children.length - 1; i >= 0; i--) {
      stack.push(curr.children[i]);
    }
  }

  return nodes;
}
