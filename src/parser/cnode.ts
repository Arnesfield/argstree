import { Config } from '../schema/schema.types';
import { Node } from '../types/node.types';
import { Options } from '../types/options.types';
import { NodeData } from './node';
import { NormalizeOptions } from './normalize';

export interface CreateNodeOptionsConfig extends Pick<Config, 'type'> {
  options: Pick<Options, 'id' | 'name'>;
}

export interface CreateNodeOptions
  extends Pick<NormalizeOptions, 'raw' | 'key' | 'alias'> {
  // partial config
  cfg: CreateNodeOptionsConfig;
}

/**
 * Creates a node object.
 * @param opts The options.
 * @param parent The parent node object.
 * @param args The node arguments.
 * @returns The node object.
 */
export function cnode(
  opts: CreateNodeOptions,
  parent: Node | null,
  args: string[]
): NodeData {
  const { cfg, raw = null, key = null, alias = null } = opts;
  return {
    id: cfg.options.id !== undefined ? cfg.options.id : key,
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
