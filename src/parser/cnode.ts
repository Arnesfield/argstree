import { Node, NodeType } from '../types/node.types.js';
import { Options } from '../types/options.types.js';
import { NormalizeOptions } from './normalize.js';

export interface CreateNodeOptions
  extends Pick<NormalizeOptions, 'raw' | 'key' | 'alias'> {
  // partial config
  cfg: { type: NodeType; options: Pick<Options, 'id' | 'name'> };
}

/** Create node object. */
export function cnode(
  opts: CreateNodeOptions,
  parent: Node | null,
  args: string[]
): Node {
  const { cfg, raw = null, key = null, alias = null } = opts;
  return {
    id: typeof cfg.options.id !== 'undefined' ? cfg.options.id : key,
    name: cfg.options.name ?? key,
    raw,
    key,
    alias,
    type: cfg.type,
    depth: parent ? parent.depth + 1 : 0,
    args,
    parent,
    children: []
  };
}
