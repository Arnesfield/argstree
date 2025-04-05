// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Options } from './options.types.js';

/** The parsed argument. */
export interface Arg {
  /** The unparsed argument. */
  raw: string;
  // NOTE: same doc as Node.key
  /** The parsed key from the argument (e.g. `--option` from `--option=value`). */
  key: string;
  /**
   * The alias used when the argument was parsed through an alias,
   * otherwise the value is `null`.
   */
  alias: string | null;
  /** The parsed value from the argument (e.g. `value` from `--option=value`). */
  value: string | null;
}

/** The node type. */
export type NodeType = 'option' | 'command' | 'value';

/** The node object. */
export interface Node {
  /** The provided {@linkcode Options.id} or the {@linkcode Node.key}. */
  id: string | null;
  /** The provided {@linkcode Options.name} or the {@linkcode Node.key}. */
  name: string | null;
  /** The unparsed argument. The value is `null` for the root node. */
  raw: string | null;
  // NOTE: same doc as Arg.key
  /** The parsed key from the argument (e.g. `--option` from `--option=value`). */
  key: string | null;
  /** The alias used to get the options for the node, otherwise the value is `null`. */
  alias: string | null;
  /** The node type. */
  type: NodeType;
  /** The node depth. */
  depth: number;
  /** The node arguments. */
  args: string[];
  /** The parent node. If `null`, then the node is a root node. */
  parent: Node | null;
  /** The child nodes. */
  children: Node[];
}
