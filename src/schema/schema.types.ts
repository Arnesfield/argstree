import { Aliases, Node, NodeData, Options } from '../core/core.types.js';

// TODO: rename type
export interface SchemaArgs extends SchemaConfig {
  arg: string;
}

export interface SchemaConfig {
  arg?: string | null;
  type: NodeData['type'];
  options: Options;
  args?: SchemaArgs[];
  aliases?: Aliases[];
}

export interface Schema {
  config(): SchemaConfig;
  option(arg: string, options?: Options): this;
  command(arg: string, options?: Options): this;
  alias(aliases: Aliases): this;
  parse(args: readonly string[]): Node;
}
