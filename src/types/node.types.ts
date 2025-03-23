import { Options } from './options.types.js';

/** The parsed argument. */
export interface Arg {
  /** The unparsed argument. */
  raw: string;
  // NOTE: same doc as NodeData.key
  /** The parsed key from the argument (e.g. `--option` from `--option=value`). */
  key: string;
  /**
   * The alias used when this argument was parsed through an alias,
   * otherwise the value is `null`.
   */
  alias: string | null;
  /** The parsed value from the argument (e.g. `value` from `--option=value`). */
  value: string | null;
}

/** The node type. */
export type NodeType = 'option' | 'command';

/** The node data. */
export interface NodeData {
  /** The unparsed argument. The value is `null` for the root node. */
  raw: string | null;
  // NOTE: same doc as Arg.key
  /** The parsed key from the argument (e.g. `--option` from `--option=value`). */
  key: string | null;
  /** The alias used to parse the options for this node, otherwise the value is `null`. */
  alias: string | null;
  /** The node type. */
  type: NodeType;
  /** The arguments for this node. */
  args: string[];
  /** The options for this node. */
  options: Options;
}

/** The node object. */
export interface Node extends Omit<NodeData, 'options'> {
  /** The provided {@linkcode Options.id} or the parsed argument. */
  id: string | null;
  /** The provided {@linkcode Options.name}. */
  name: string | null;
  /** Depth of node. */
  depth: number;
  /** The parent node. If `null`, then this is the root node. */
  parent: Node | null;
  /** The child nodes. */
  children: Node[];
}
