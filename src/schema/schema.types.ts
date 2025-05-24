import { ParseError } from '../lib/error';
import { Split } from '../lib/split';
import { Node } from '../types/node.types';
import { Options } from '../types/options.types';

/** The schema type. */
export type SchemaType = 'option' | 'command';

/**
 * The schema map.
 * @template T The metadata type.
 */
export interface SchemaMap<T = unknown> {
  [arg: string]: Schema<T>;
}

/**
 * The resolved config.
 * @template T The metadata type.
 */
export interface ResolvedConfig<T = unknown> {
  /** The matched argument. */
  key: string;
  /** The alias used to parse argument if any. */
  alias?: string;
  /** The schema type. */
  type: SchemaType;
  /** The options object. */
  options: Options<T>;
}

/**
 * The resolved argument.
 * @template T The metadata type.
 */
export type ResolvedArg<T = unknown> =
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
  /** The schema type. */
  readonly type: SchemaType;
  /** The options object. */
  readonly options: Options<T>;
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
   * Gets the list configured schemas.
   * @returns The schema map.
   */
  schemas(): SchemaMap<T>;
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
   * @throws A {@linkcode ParseError} for invalid options, unrecognized arguments,
   * and unsatisfied ranges. Other types of errors can also be thrown through
   * callbacks like {@linkcode Options.onValidate}.
   */
  parse(args: readonly string[]): Node<T>;
}
