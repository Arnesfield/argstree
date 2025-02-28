export interface Arg {
  raw: string;
  key: string;
  value: string | null;
}

export interface Args {
  [arg: string]: Options | boolean | null | undefined;
}

export type Alias =
  | string
  | [string, ...string[]]
  | [[string, ...string[]], ...[string, ...string[]][]];

export interface Aliases {
  [alias: string]: Alias | null | undefined;
}

export interface NodeData {
  raw: string | null;
  key: string | null;
  alias: string | null;
  args: string[];
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
  // TODO: note inherited
  /** @default true */
  strict?: boolean;
  handler?(
    this: this,
    arg: Arg,
    data: NodeData
  ): ParseOptions | boolean | null | undefined | void;
  done?(this: this, data: NodeData): void;
}

export interface Options extends ParseOptions {
  assign?: boolean;
  alias?: Alias | null;
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
