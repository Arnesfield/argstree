import { ArgConfig, Schema } from '../schema/schema.types';
import { Node } from '../types/node.types';
import { Options } from '../types/options.types';
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
  schema?: Schema<T>;
}

export interface PartialConfig<T> extends Pick<ArgConfig<T>, 'type'> {
  options: Pick<Options<T>, 'id' | 'name'>;
}

export interface CreateNodeOptions<T>
  extends Pick<NodeOptions<T>, 'key' | 'alias' | 'value'> {
  cfg: PartialConfig<T>;
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
  opts: CreateNodeOptions<T>,
  parent: Node<T> | null,
  args: string[] = []
): NodeData<T> {
  // prettier-ignore
  const { key = null, alias = null, value = null, cfg: { type, options: { id = key, name = key } } } = opts;
  const depth = parent ? parent.depth + 1 : 0;
  // prettier-ignore
  return { id, name, raw, key, alias, value, type, depth, args, parent, children: [] };
}
