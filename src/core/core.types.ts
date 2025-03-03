export interface Arg {
  readonly raw: string;
  readonly key: string;
  readonly alias: string | null;
  readonly value: string | null;
}

export interface Args {
  [arg: string]: Options | boolean | null | undefined;
}

export interface Aliases {
  [alias: string]: string | string[] | string[][] | null | undefined;
}

/** The node data. */
export interface NodeData {
  /** The parsed argument. The value is `null` for the root node. */
  raw: string | null;
  /** The parsed key from the argument (e.g. `--option` from `--option=value`). */
  key: string | null;
  /** The alias used to parse the options for this node. Otherwise, the value is `null`. */
  alias: string | null;
  /** The arguments for this node. */
  args: string[];
  /** The options for this node. */
  options: Options;
}

export interface ParseOptions {
  id?: string | null | ((data: NodeData) => string | null | undefined);
  name?: string;
  type?: 'option' | 'command';
  aliases?: Aliases;
  args?: Args;
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
  handler?(
    this: this,
    arg: Arg,
    data: NodeData
  ): ParseOptions | boolean | null | undefined | void;
  done?(this: this, data: NodeData): void;
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
