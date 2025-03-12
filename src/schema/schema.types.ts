import { Aliases, Node, NodeData, Options } from '../core/core.types.js';

export interface ArgConfig extends Pick<Config, 'type' | 'options'> {
  arg: string;
}

export interface Config {
  type: NodeData['type'];
  options: Options;
  args?: { [arg: string]: ArgConfig | null | undefined };
  aliases?: {
    [alias: string]:
      | [[string, ...string[]], ...[string, ...string[]][]]
      | null
      | undefined;
  };
}

export interface Schema {
  option(arg: string, options?: Options): this;
  command(arg: string, options?: Options): this;
  alias(aliases: Aliases): this;
  config(): Config;
  parse(args: readonly string[]): Node;
}
