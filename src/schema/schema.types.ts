// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ParseError } from '../core/error.js';
import { Node, NodeType } from '../types/node.types.js';
import { Options } from '../types/options.types.js';

/** The aliases object. */
export interface Aliases {
  [alias: string]: string | string[] | string[][] | null | undefined;
}

/** The schema config. */
export interface Config {
  /** The node type. */
  type: Exclude<NodeType, 'value'>;
  /** The schema options. */
  options: Options;
  /**
   * The list of configs for the options and commands.
   * Note that the config properties may change during parsing.
   */
  args: { [arg: string]: ArgConfig };
  /** The list of aliases. */
  aliases: Aliases;
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
   * @param aliases The list of aliases.
   * @returns `this` for chaining.
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
   *     ['--option1', 'arg1', 'arg2'],
   *     ['--option2', 'arg1', 'arg2']
   *   ]
   * });
   */
  alias(aliases: Aliases): this;
  /**
   * Gets the schema config. This is mainly used internally during parsing.
   * @returns The schema config.
   */
  config(): Config;
  /**
   * Parses arguments into a tree structure.
   * @param args The arguments to parse.
   * @returns The node object.
   * @throws A {@linkcode ParseError} for invalid options,
   * unrecognized arguments, and unsatisfied ranges.
   * Other types of errors can also be thrown through other callbacks like
   * {@linkcode Options.preValidate}, {@linkcode Options.postValidate}, etc.
   */
  parse(args: readonly string[]): Node;
}
