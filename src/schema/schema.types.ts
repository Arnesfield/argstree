// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ParseError } from '../lib/error';
import { Node, NodeType } from '../types/node.types';
import { Options } from '../types/options.types';

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
}

/** The config for options and commands. */
export type ArgConfig = Omit<Config, 'args'> & Partial<Pick<Config, 'args'>>;

/** The schema object. */
export interface Schema {
  /**
   * Adds an option. The argument is overwritten if it already exists.
   * @param arg The argument to match.
   * @param options The schema options.
   * @returns `this` for chaining.
   */
  option(arg: string, options?: Options): this;
  /**
   * Adds a command. The argument is overwritten if it already exists.
   * @param arg The argument to match.
   * @param options The schema options.
   * @returns `this` for chaining.
   */
  command(arg: string, options?: Options): this;
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
