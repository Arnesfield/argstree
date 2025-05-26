import { Node } from '../types/node.types';
import { Options } from '../types/options.types';
import { Schema } from '../types/schema.types';
import { array } from '../utils/array';

// NOTE: internal

export interface NodeOptions<T> {
  key?: string;
  alias?: string;
  value?: string;
  /** Resolved arguments (includes the `options.args` and parsed value). */
  args?: string[];
  schema: Schema<T>;
}

export interface PartialSchema<T> extends Pick<Schema<T>, 'type'> {
  options: Pick<Options<T>, 'id' | 'name' | 'args'>;
}

export interface CreateNodeOptions<T>
  extends Pick<NodeOptions<T>, 'key' | 'alias' | 'value'> {
  schema: PartialSchema<T>;
}

// same as INode but cannot be a value type
export interface NodeData<T>
  extends Omit<Node<T>, 'type'>,
    Pick<Schema<T>, 'type'> {}

/**
 * Creates a node object.
 * @param opts The options.
 * @param raw The unparsed argument.
 * @param parent The parent node object.
 * @param args The node arguments.
 * @returns The node object.
 */
export function cnode<T>(
  opts: CreateNodeOptions<T>,
  raw: string | null = null,
  parent: Node<T> | null = null,
  args = array(opts.schema.options.args)
): NodeData<T> {
  // prettier-ignore
  const { key = null, alias = null, value = null, schema: { type, options: { id = key, name = key } } } = opts;
  const depth = parent ? parent.depth + 1 : 0;
  // prettier-ignore
  return { id, name, raw, key, alias, value, type, depth, args, parent, children: [] };
}
