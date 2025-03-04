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

export interface Aliases {
  [alias: string]: string | string[] | string[][] | null | undefined;
}

export interface Args {
  [arg: string]: Options | boolean | null | undefined;
}

/** The node data. */
export interface NodeData {
  /** The unparsed argument. The value is `null` for the root node. */
  raw: string | null;
  // NOTE: same doc as Arg.key
  /** The parsed key from the argument (e.g. `--option` from `--option=value`). */
  key: string | null;
  /** The alias used to parse the options for this node, otherwise the value is `null`. */
  alias: string | null;
  /** The arguments for this node. */
  args: string[];
  /** The options for this node. */
  options: Options;
}

export interface ParseOptions {
  id?:
    | string
    | null
    | ((this: this, data: NodeData) => string | null | undefined | void);
  name?: string;
  type?: 'option' | 'command';
  initial?: string[];
  min?: number | null;
  max?: number | null;
  maxRead?: number | null;
  /**
   * - `true` - Enable strict mode for both self and descendants.
   * - `false` - Disable strict mode for both self and descendants.
   * - `self` - Enable strict mode for self but disable it for descendants.
   * - `descendants` - Disable strict mode for self but enable it for descendants.
   * @default false
   */
  strict?: boolean | 'self' | 'descendants';
  aliases?: Aliases | null;
  args?: Args | null;
  handler?(
    this: this,
    arg: Arg,
    data: NodeData
  ): ParseOptions | boolean | null | undefined | void;
  onBeforeParse?(this: this, data: NodeData): void;
  onAfterParse?(this: this, data: NodeData): void;
}

export interface Options extends ParseOptions {
  assign?: boolean;
  alias?: string | (string | string[])[] | null;
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
