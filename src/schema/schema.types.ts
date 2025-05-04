// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ParseError } from '../lib/error';
import { Node, NodeType } from '../types/node.types';
import { Options } from '../types/options.types';

/**
 * The schema config.
 * @template T The metadata type.
 */
export interface Config<T = unknown> {
  /** The node type. */
  type: Exclude<NodeType, 'value'>;
  /** The schema options. */
  options: Options<T>;
  /**
   * The list of configs for the options and commands.
   * Note that the config properties may change during parsing.
   */
  args: { [arg: string]: ArgConfig<T> };
}

/**
 * The config for options and commands.
 * @template T The metadata type.
 */
export type ArgConfig<T = unknown> = Omit<Config<T>, 'args'> &
  Partial<Pick<Config<T>, 'args'>>;

/**
 * The schema object.
 * @template T The metadata type.
 */
export interface Schema<T = unknown> {
  /**
   * Adds an option. The argument is overwritten if it already exists.
   * @param arg The argument to match.
   * @param options The schema options.
   * @returns `this` for chaining.
   */
  option(arg: string, options?: Options<T>): this;
  /**
   * Adds a command. The argument is overwritten if it already exists.
   * @param arg The argument to match.
   * @param options The schema options.
   * @returns `this` for chaining.
   */
  command(arg: string, options?: Options<T>): this;
  /**
   * Gets the schema config. This is mainly used internally during parsing.
   * @returns The schema config.
   */
  config(): Config<T>;
  /**
   * Parses arguments into a tree structure.
   * @param args The arguments to parse.
   * @returns The node object.
   * @throws A {@linkcode ParseError} for invalid options,
   * unrecognized arguments, and unsatisfied ranges.
   * Other types of errors can also be thrown through callbacks like
   * {@linkcode Options.onValidate}.
   */
  parse(args: readonly string[]): Node<T>;
}
