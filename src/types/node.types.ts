import { Options } from './options.types.js';

/** The parsed argument. */
export interface Arg {
  /** The unparsed argument. */
  readonly raw: string;
  // NOTE: same doc as NodeData.key
  /** The parsed key from the argument (e.g. `--option` from `--option=value`). */
  readonly key: string;
  /**
   * The alias used when this argument was parsed through an alias,
   * otherwise the value is `null`.
   */
  readonly alias: string | null;
  /** The parsed value from the argument (e.g. `value` from `--option=value`). */
  readonly value: string | null;
}

/** The node data. */
export interface NodeData {
  /** The unparsed argument. The value is `null` for the root node. */
  readonly raw: string | null;
  // NOTE: same doc as Arg.key
  /** The parsed key from the argument (e.g. `--option` from `--option=value`). */
  readonly key: string | null;
  /** The alias used to parse the options for this node, otherwise the value is `null`. */
  readonly alias: string | null;
  /** The type of node. */
  readonly type: 'option' | 'command';
  /** The arguments for this node. */
  readonly args: string[];
  /** The options for this node. */
  readonly options: Options;
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
  /** The direct children nodes. */
  children: Node[];
  /** The ancestor nodes starting from the root node to the parent node. */
  ancestors: Node[];
  /** The descendant nodes starting from the children nodes down to the leaf nodes. */
  descendants: Node[];
}
