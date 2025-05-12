import { ArgConfig } from '../schema/schema.types';
import { Node } from '../types/node.types';
import { NodeData } from './node';

// NOTE: internal

export interface NodeOptions<T> {
  key?: string;
  alias?: string;
  value?: string;
  /** Resolved arguments (includes the `options.args` and parsed value). */
  args?: string[];
  /** Reference to the config object. */
  cfg: ArgConfig<T>;
}

/**
 * Creates a node object.
 * @param raw The unparsed argument.
 * @param opts The options.
 * @param parent The parent node object.
 * @param args The node arguments.
 * @returns The node object.
 */
export function cnode<T>(
  raw: string | null,
  opts: NodeOptions<T>,
  parent: Node<T> | null,
  args: string[] = []
): NodeData<T> {
  // prettier-ignore
  const { key = null, alias = null, value = null, cfg: { type, options: { id = key, name = key } } } = opts;
  const depth = parent ? parent.depth + 1 : 0;
  // prettier-ignore
  return { id, name, raw, key, alias, value, type, depth, args, parent, children: [] };
}
