// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ParseError } from '../lib/error';
import { Split } from '../lib/split';
import { Node } from '../types/node.types';
import { Options } from '../types/options.types';

/** The schema type. */
export type SchemaType = 'option' | 'command';

/**
 * The schema config.
 * @template T The metadata type.
 */
export interface Config<T = unknown> {
  /** The schema type. */
  type: SchemaType;
  /** The options object. */
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
 * The resolved config.
 * @template T The metadata type.
 */
export interface ResolvedConfig<T = unknown> extends Omit<Config<T>, 'args'> {
  /** The matched argument. */
  key: string;
  /** The alias used to parse argument if any. */
  alias?: string;
}

/** The resolved argument. */
export type ResolvedArg<T> =
  | {
      /** The split result with remaining values. */
      split: Split;
      configs?: never;
    }
  | {
      split?: never;
      /** The resolved configs. */
      configs: ResolvedConfig<T>[];
    };

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
   * Resolves the argument and returns the configuration for the matching
   * options and commands. If the argument cannot be resolved, this returns
   * either `undefined` or the split result if the argument is a short option.
   * @param arg The argument to resolve.
   * @returns The resolved argument.
   */
  resolve(arg: string): ResolvedArg<T> | undefined;
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
