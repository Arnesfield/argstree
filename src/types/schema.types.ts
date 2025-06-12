import { ParseError } from '../lib/error';
import { Split } from '../lib/split';
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
  /** The alias used to parse argument if any. */
  alias: string | null;
  /** The schema type. */
  type: SchemaType;
  /** The resolved options. */
  options: ResolvedOptions<T>;
}

/** The resolved argument. */
export type ResolvedArg<T = unknown> = Arg &
  (
    | { split: Split; items?: never }
    | {
        split?: never;
        /** The resolved items. */
        items: ResolvedItem<T>[];
      }
  );

/** The config object. */
export interface Config<T = unknown> {
  /** The schema type. */
  readonly type: SchemaType;
  /** The schema options. */
  readonly options: Options<T>;
  // TODO: doc
  readonly map: { [arg: string]: ArgConfig<T> };
}

// TODO: doc
export interface ArgConfig<T = unknown>
  extends Omit<Config<T>, 'map'>,
    Partial<Pick<Config<T>, 'map'>> {}

/** The schema object. */
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
  // TODO: doc
  config(options?: Options<T>): Config<T>;
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
