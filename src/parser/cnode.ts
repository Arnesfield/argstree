import { Config } from '../schema/schema.types';
import { Node } from '../types/node.types';
import { Options } from '../types/options.types';
import { NodeData } from './node';
import { NormalizeOptions } from './normalize';

// NOTE: internal

export interface CreateNodeOptionsConfig<T> extends Pick<Config<T>, 'type'> {
  options: Pick<Options<T>, 'id' | 'name'>;
}

export interface CreateNodeOptions<T>
  extends Pick<NormalizeOptions<T>, 'raw' | 'key' | 'alias'> {
  // partial config
  cfg: CreateNodeOptionsConfig<T>;
}

/**
 * Creates a node object.
 * @param opts The options.
 * @param parent The parent node object.
 * @param args The node arguments.
 * @returns The node object.
 */
export function cnode<T>(
  opts: CreateNodeOptions<T>,
  parent: Node<T> | null,
  args: string[]
): NodeData<T> {
  // prettier-ignore
  const { raw = null, key = null, alias = null, cfg: { type, options: { id = key, name = key } } } = opts;
  const depth = parent ? parent.depth + 1 : 0;
  return { id, name, raw, key, alias, type, depth, args, parent, children: [] };
}
