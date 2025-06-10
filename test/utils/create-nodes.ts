import { Node } from '../../src';

export interface PartialNode
  extends Partial<Omit<Node, 'parent' | 'children'>> {
  children?: PartialNode[];
}

export function createNodes(partial: PartialNode = {}): Node[] {
  const items: { partial: PartialNode; parent: Node | null; node?: Node }[] = [
    { partial, parent: null }
  ];

  for (const item of items) {
    const { parent } = item;
    const { children, ...pNode } = item.partial;

    // remove undefined from pNode
    // use for...in and assume no inherited keys
    let k: keyof typeof pNode;
    for (k in pNode) {
      if (pNode[k] === undefined) {
        delete pNode[k];
      }
    }

    const { key = null } = pNode;
    item.node = {
      id: key,
      name: key,
      raw: key,
      key,
      alias: null,
      value: null,
      type: 'option',
      depth: parent ? parent.depth + 1 : 0,
      args: pNode.args || [],
      parent,
      children: []
    };
    Object.assign(item.node, pNode);
    parent?.children.push(item.node);

    for (const child of children || []) {
      items.push({ partial: child, parent: item.node });
    }
  }

  // assume nodes exist
  return items.map(item => item.node!);
}
