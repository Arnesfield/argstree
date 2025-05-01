import { Config } from '../schema/schema.types';
import { Node } from '../types/node.types';
import { Options } from '../types/options.types';
import { NodeData } from './node';
import { NormalizeOptions } from './normalize';

// NOTE: internal

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
  // prettier-ignore
  const { raw = null, key = null, alias = null, cfg: { type, options: { id = key, name = key } } } = opts;
  const depth = parent ? parent.depth + 1 : 0;
  return { id, name, raw, key, alias, type, depth, args, parent, children: [] };
}
