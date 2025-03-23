import { ParseError } from '../core/error.js';
import { Schema } from '../schema/schema.types.js';
import { Arg, Node, NodeData } from './node.types.js';

/** The schema options. */
export interface SchemaOptions {
  id?: string | null | ((data: NodeData) => string | null | void);
  name?: string;
  args?: string[];
  min?: number;
  max?: number;
  maxRead?: number;
  /**
   * - `true` - Enable strict mode for both self and descendants.
   * - `false` - Disable strict mode for both self and descendants.
   * - `self` - Enable strict mode for self but disable it for descendants.
   * - `descendants` - Disable strict mode for self but enable it for descendants.
   * @default false
   */
  strict?: boolean | 'self' | 'descendants';
  /**
   * When enabled, parsed nodes are considered leaf nodes.
   * If additional options or commands are configured for the schema,
   * this value is ignored.
   *
   * Default value is `true` for `option` types and `false` for `command` types.
   */
  leaf?: boolean;
  init?(schema: Schema): void;
  handler?(arg: Arg, data: NodeData): Schema | Schema[] | null | void;
  preData?(data: NodeData): void;
  postData?(error: ParseError | null, data: NodeData): void;
  preParse?(error: ParseError | null, node: Node): void;
  // NOTE: if handling postParse, handle error throw instead
  // TODO: node contains complete references but other references may not be complete
  postParse?(error: ParseError | null, node: Node): void;
}

export interface Options extends SchemaOptions {
  assign?: boolean;
  alias?: string | (string | string[])[] | null;
}
