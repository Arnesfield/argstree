import { Aliases, Node, NodeData, Options } from '../core/core.types.js';

export type ConfigAlias = [[string, ...string[]], ...[string, ...string[]][]];

export interface Config {
  type: NodeData['type'];
  options: Options;
  args: { [arg: string]: Config | ArgConfig | null | undefined };
  aliases: { [alias: string]: ConfigAlias | null | undefined };
}

export interface ArgConfig
  extends Omit<Config, 'args' | 'aliases'>,
    Partial<Pick<Config, 'args' | 'aliases'>> {
  key: string;
}

export interface Schema {
  option(arg: string, options?: Options): this;
  command(arg: string, options?: Options): this;
  alias(aliases: Aliases): this;
  config(): Config;
  parse(args: readonly string[]): Node;
}
