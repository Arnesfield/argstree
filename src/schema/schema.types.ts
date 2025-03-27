import { Node, NodeType } from '../types/node.types.js';
import { Options } from '../types/options.types.js';

/** The aliases object. */
export interface Aliases {
  [alias: string]: string | string[] | string[][] | null | undefined;
}

/** The schema config. */
export interface Config {
  /** The node type. */
  type: NodeType;
  /** The schema options. */
  options: Options;
  /**
   * List of options and commands and their config.
   *
   * Note that the config properties are updated during parsing.
   */
  args: { [arg: string]: ArgConfig };
  /** List of aliases. */
  aliases: { [alias: string]: Aliases[string] };
}

/** The config for options or commands. */
export interface ArgConfig
  extends Omit<Config, 'args' | 'aliases'>,
    Partial<Pick<Config, 'args' | 'aliases'>> {
  /** The argument to match. */
  arg: string;
}

/** The schema object. */
export interface Schema {
  /**
   * Adds an option. The option is overwritten if it already exists.
   * @param arg The argument to match.
   * @param options The schema options.
   * @returns `this` for chaining.
   */
  option(arg: string, options?: Options): this;
  /**
   * Adds a command. The command is overwritten if it already exists.
   * @param arg The argument to match.
   * @param options The schema options.
   * @returns `this` for chaining.
   */
  command(arg: string, options?: Options): this;
  /**
   * Sets a list of aliases. Can be called multiple times.
   * These aliases are mapped to:
   *
   * - An option or command (`string`).
   * - An option or command with additional arguments (`string[]`).
   * - Multiple options or commands (`string[][]`).
   * - Multiple options or commands with arguments (`string[][]`).
   *
   * Note that all options and commands are paresd on the same level
   * (i.e. a command followed by an option will not nest the option).
   *
   * @example
   * cmd.alias({
   *   // option or command
   *   r: 'command',
   *   '-o': '--option',
   *   // option or command with additional arguments
   *   '-o1': ['--option', 'arg1', 'arg2'],
   *   // multiple options or commands
   *   '-o2': [['--option1'], ['--option2']],
   *   // multiple options or commands with arguments
   *   '-o3': [
   *      ['--option1', 'arg1', 'arg2'],
   *      ['--option2', 'arg1', 'arg2']
   *    ]
   * });
   *
   * @param aliases The list of aliases.
   * @returns `this` for chaining.
   */
  alias(aliases: Aliases): this;
  /**
   * Gets the schema config.
   *
   * This method is used internally to read the schema config.
   */
  config(): Config;
  /**
   * Parses arguments into a tree structure.
   * @param args The arguments to parse.
   * @returns The node object.
   */
  parse(args: readonly string[]): Node;
}
