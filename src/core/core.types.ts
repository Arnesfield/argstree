import { Spec } from '../spec/spec.types.js';

// TODO: pending
export interface NodeData {
  raw: string | null;
  alias: string | null;
  args: string[];
  options: Options;
}

export type Alias =
  | string
  | [string, ...string[]]
  | [[string, ...string[]], ...[string, ...string[]][]]
  | null
  | undefined;

export interface Options {
  id?:
    | string
    | ((raw: string | null, data: NodeData) => string | null | undefined);
  name?: string;
  // TODO: add not that this is unaffected by limits
  initial?: string[];
  min?: number | null;
  max?: number | null;
  maxRead?: number | null;
  // only applies to options and commands
  alias?: Alias;
  // default true for options
  assign?: boolean;
  // inherited
  strict?: boolean;
  // inherited
  // TODO: single character only
  /** @default '-' */
  splitAliasChar?: string;
  // inherited
  /** @default '=' */
  assignChar?: string;
  // TODO: rename to afterParse or onParse
  // TODO: maybe pass in the Node itself?
  // TODO: also pass in a function to stop parsing?
  onParse?(data: NodeData): string[] | null | undefined | void;
  // TODO: call spec on add
  spec?(spec: Spec): void;
  args?(arg: string, data: NodeData): Spec | Spec[] | null | undefined | void;
}
