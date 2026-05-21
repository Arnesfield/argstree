import { ParseError } from '../lib/error';
import { Arg } from './arg.types';
import { Node } from './node.types';
import { Options } from './options.types';
import { XOR } from './util.types';

/** The parser type. */
export type ParserType = 'option' | 'command';

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
  // TODO: add value
  /** The parser type. */
  type: ParserType;
  /** The resolved options. */
  options: ResolvedOptions<T>;
}

/** The resolved argument. */
export interface ResolvedArg<T = unknown> extends Arg {
  /** The resolved items. */
  items?: ResolvedItem<T>[];
}

// TODO: rename?
/** The parser value. */
export interface Value {
  /** Arguments to be saved to the current node. */
  args: string | string[];
  /** Overrides the strict mode for the current node. */
  strict?: boolean;
}

// TODO: add doc
export type Fallback<T> = (
  arg: Arg,
  node: Node<T>
) => XOR<Parser<T>, Value> | XOR<Parser<T>, Value>[] | boolean | void;

/** The parser object. */
export interface Parser<T = unknown> {
  /**
   * Sets the argument to match.
   * @param arg The argument(s) to match.
   * @param options The parser or options. Set to `null` to remove the argument.
   * @returns `this` for chaining.
   */
  arg(
    arg: string | string[],
    options?: Options<T> | Parser<T> | (() => Parser<T> | null) | null
  ): this;
  // TODO: add doc
  fallback(fn: Fallback<T> | null): this;
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
