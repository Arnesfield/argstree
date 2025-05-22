import { SchemaType } from '../schema/schema.types';
import { Options } from './options.types';

/** The node type. */
export type NodeType = SchemaType | 'value';

/**
 * The node object.
 * @template T The metadata type.
 */
export interface Node<T = unknown> {
  /** The provided {@linkcode Options.id} or the {@linkcode Node.key}. */
  id: string | null;
  /** The provided {@linkcode Options.name} or the {@linkcode Node.key}. */
  name: string | null;
  /** The unparsed argument. The value is `null` for the root node. */
  raw: string | null;
  // NOTE: same doc as Arg.key
  /** The parsed key from the argument (e.g. `--option` from `--option=value`). */
  key: string | null;
  /** The alias used to parse the node if any. */
  alias: string | null;
  // NOTE: same doc as Arg.value
  /** The parsed value from the argument (e.g. `value` from `--option=value`). */
  value: string | null;
  /** The node type. */
  type: NodeType;
  /** The node depth. */
  depth: number;
  /** The node arguments. */
  args: string[];
  /** The parent node. If `null`, then the node is the root node. */
  parent: Node<T> | null;
  /** The child nodes. */
  children: Node<T>[];
  /** The node metadata. */
  meta?: T;
}
