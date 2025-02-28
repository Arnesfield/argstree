export interface Arg {
  raw: string;
  name: string;
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
  name: string | null;
  alias: string | null;
  args: string[];
  options: Options;
}

export interface ParseOptions {
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
