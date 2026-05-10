import { ParseError } from '../lib/error';
import { Arg } from './arg.types';
import { Node } from './node.types';
import { Options } from './options.types';

/** The schema type. */
export type SchemaType = 'option' | 'command';

/** The resolved options. */
export interface ResolvedOptions<T = unknown> extends Options<T> {
  // require id and name
  id: string | null;
  name: string | null;
  // use string array for args
  args: string[];
}

/** The resolved item. */
export interface ResolvedItem<T = unknown> {
  /** The matched argument. */
  key: string;
  /** The schema type. */
  type: SchemaType;
  /** The resolved options. */
  options: ResolvedOptions<T>;
}

/** The resolved argument. */
export interface ResolvedArg<T = unknown> extends Arg {
  /** The resolved items. */
  items?: ResolvedItem<T>[];
}

/** The schema object. */
export interface Schema<T = unknown> {
  /**
   * Adds or removes an option. The argument is overwritten if it already exists.
   * @param arg The argument(s) to match.
   * @param options The schema options or `null` to remove.
   * @returns `this` for chaining.
   */
  option(arg: string | string[], options?: Options<T> | null): this;
  /**
   * Adds or removes a command. The argument is overwritten if it already exists.
   * @param arg The argument(s) to match.
   * @param options The schema options or `null` to remove.
   * @returns `this` for chaining.
   */
  command(arg: string | string[], options?: Options<T> | null): this;
  /**
   * Gets the configuration for the matched options and commands.
   * The {@linkcode key} is checked to have a value (e.g., `--option=value`)
   * unless {@linkcode value} is provided and not `undefined`.
   * @param key The argument or parsed key.
   * @param value The parsed value, if any.
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
