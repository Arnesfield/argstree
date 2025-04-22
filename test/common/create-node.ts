import { Node } from '../../src';
import { cnode } from '../../src/parser/cnode';

export function createNode(opts: Partial<Node> = {}): Node {
  const node: Node = cnode(
    { raw: opts.key, key: opts.key, cfg: { type: 'option', options: {} } },
    opts.parent || null,
    opts.args || []
  );
  Object.assign(node, opts);
  return node;
}
