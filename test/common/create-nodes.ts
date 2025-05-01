import { Node } from '../../src';
import { cnode } from '../../src/parser/cnode';

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
    for (const key of Object.keys(pNode) as (keyof typeof pNode)[]) {
      if (pNode[key] === undefined) {
        delete pNode[key];
      }
    }

    item.node = cnode(
      { raw: pNode.key, key: pNode.key, cfg: { type: 'option', options: {} } },
      parent,
      pNode.args || []
    );
    Object.assign(item.node, pNode);
    parent?.children.push(item.node);

    for (const child of children || []) {
      items.push({ partial: child, parent: item.node });
    }
  }

  // assume nodes exist
  return items.map(item => item.node!);
}
