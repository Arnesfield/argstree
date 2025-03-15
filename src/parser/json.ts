import { Node, NodeJson } from '../types/node.types.js';
import { obj } from '../utils/obj.js';

export function json(this: Node): NodeJson {
  type J = NodeJson;
  const node: J = { args: this.args.slice(), options: obj(), commands: obj() };

  for (const child of this.children) {
    const id = child.id ?? child.key;
    if (id == null) continue;
    const args = node[child.type === 'option' ? 'options' : 'commands'];
    args[id] ? args[id].args.push(...child.args) : (args[id] = child.json());
  }

  return node;
}
