import { Schema } from '../schema/schema.types.js';
import { Arg, NodeData } from './node.types.js';

/** The schema options. */
export interface SchemaOptions {
  id?: string | null | ((data: NodeData) => string | null | undefined | void);
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
  handler?(arg: Arg, data: NodeData): Schema | null | undefined | void;
  preParse?(data: NodeData): void;
  postParse?(data: NodeData): void;
  done?(data: NodeData): void;
}

export interface Options extends SchemaOptions {
  assign?: boolean;
  alias?: string | (string | string[])[] | null;
}
