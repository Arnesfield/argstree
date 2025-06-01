import { ParseError } from '../lib/error';
import { Split } from '../lib/split';
import { Node } from './node.types';
import { Options } from './options.types';

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
 * The resolved options.
 * @template T The metadata type.
 */
export interface ResolvedOptions<T = unknown> extends Options<T> {
  // require id and name
  id: string | null;
  name: string | null;
  // use string array for args
  args: string[];
}

/**
 * The resolved item.
 * @template T The metadata type.
 */
export interface ResolvedItem<T = unknown> {
  /** The matched argument. */
  key: string;
  /** The alias used to parse argument if any. */
  alias: string | null;
  /** The schema type. */
  type: SchemaType;
  /** The resolved options. */
  options: ResolvedOptions<T>;
}

/**
 * The resolved argument.
 * @template T The metadata type.
 */
export type ResolvedArg<T = unknown> =
  | {
      /** The split result with remaining values. */
      split: Split;
      items?: never;
    }
  | {
      split?: never;
      /** The resolved items. */
      items: ResolvedItem<T>[];
    };

/**
 * The schema object.
 * @template T The metadata type.
 */
export interface Schema<T = unknown> {
  /** The schema type. */
  readonly type: SchemaType;
  /** The schema options. */
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
   * Gets the configuration for the matched options and commands.
   * The {@linkcode key} is checked to have a value (e.g. `--option=value`)
   * unless {@linkcode value} is provided and not `undefined`.
   * If the argument cannot be resolved, this returns either `undefined`
   * or the {@linkcode Split} result if the argument is a short option.
   * @param key The argument or parsed key.
   * @param value The parsed value if any.
   * @returns The resolved argument.
   */
  resolve(key: string, value?: string | null): ResolvedArg<T> | undefined;
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
