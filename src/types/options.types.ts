import { ParseError } from '../lib/error';
import { Arg } from './arg.types';
import { Node } from './node.types';
import { Schema } from './schema.types';
import { XOR } from './util.types';

/** The callback context. */
export interface Context<T = unknown> {
  /** The current {@linkcode Options.min} option for the node. */
  min: number | null;
  /** The current {@linkcode Options.max} option for the node. */
  max: number | null;
  /** The current {@linkcode Options.read} option for the node. */
  read: boolean;
  /** The node object. */
  readonly node: Node<T>;
  /** The schema object. */
  readonly schema: Schema<T>;
}

/** The parser value. */
export interface Value {
  /** Arguments to be saved to the current node. */
  args: string | string[];
  /** Overrides the strict mode for the node when validating {@linkcode args}. */
  strict?: boolean;
}

/** The schema options. */
export interface Options<T = unknown> {
  /**
   * The option or command ID that is set to {@linkcode Node.id}.
   * If not provided, the default value is the {@linkcode Node.key}.
   */
  id?: string | null;
  /**
   * The option or command display name that is set to {@linkcode Node.name}
   * and is used for {@linkcode ParseError} messages.
   * If not provided, the default value is the {@linkcode Node.key}.
   */
  name?: string | null;
  /**
   * The initial arguments for the option or command. Strict mode does not apply to these values.
   * Note that this is not a default value and additional arguments will be added on top of this list.
   */
  args?: string | string[];
  /**
   * The minimum number of arguments to read before the next parsed option or command.
   *
   * A {@linkcode ParseError} is thrown if the option or command does not satisfy this condition.
   */
  min?: number;
  /**
   * The maximum number of arguments to read before the next parsed option or command.
   * Arguments over the maximum limit are saved to the parent option or command instead.
   *
   * {@link assign Assigned values} are always treated as arguments
   * for the option or command regardless of the {@linkcode max} option.
   *
   * A {@linkcode ParseError} is thrown if the option or command does not
   * satisfy this condition or if the parent option or command cannot accept
   * any more arguments.
   */
  max?: number;
  /**
   * The alias, list of aliases, or list of aliases with arguments for the option or command.
   *
   * Aliases that start with a single dash (`-`) can be grouped together after
   * a single dash (e.g. aliases `-a`, `-b`, and `-c` can be written as `-abc`).
   *
   * If the option or command requires a value, it must be the last option when its alias
   * is grouped together with other aliases, otherwise a {@linkcode ParseError} is thrown.
   * @example
   * const cmd = command()
   *   .option('--input', { alias: '-i' })
   *   .option('--force', { alias: ['-f', ['--no-force', '0']] })
   *   .command('run', { alias: ['r', 'rum', 'urn'] });
   */
  alias?: string | (string | string[])[];
  /**
   * When disabled, the option or command will not accept any arguments
   * (except for {@link assign assigned values}) and are instead saved to
   * the parent option or command if it can accept arguments. Otherwise,
   * a {@linkcode ParseError} is thrown and the argument is treated as an
   * unrecognized option or command.
   * @default true
   */
  read?: boolean;
  /**
   * Determines if the option or command can have an assigned value using the
   * equal sign (e.g. `--option=value`, `command=value`). Otherwise, the option
   * or command will not be matched and the argument is treated like a normal value.
   *
   * The default value is `true` for `option` types and `false` for `command` types.
   */
  assign?: boolean;
  /**
   * When enabled, a {@linkcode ParseError} is thrown for
   * unrecognized arguments that look like an option (e.g. `-o`, `--option`).
   * Can be one of the following values:
   *
   * - `true` - Enable strict mode for both self and descendants.
   * - `false` - Disable strict mode for both self and descendants.
   * - `self` - Enable strict mode for self but disable it for descendants.
   * - `descendants` - Disable strict mode for self but enable it for descendants.
   *
   * Note that string values returned by the {@linkcode parser} callback
   * are excluded from the strict mode checks.
   * @default false
   */
  strict?: boolean | 'self' | 'descendants';
  /**
   * When `true`, parsed nodes will be treated as leaf nodes (no child nodes).
   * When `false`, parsed nodes will be treated as parent nodes (has child nodes).
   *
   * If not provided, this option defaults to `true` for `option` types
   * or if there are no options or commands configured for the schema.
   * Otherwise, this is `false`.
   */
  leaf?: boolean;
  /**
   * Called only once when the schema is created and is used to gain
   * a reference to the schema object to add options and/or commands.
   * @param schema The schema object.
   * @example
   * const cmd = command()
   *   .option('--help')
   *   .command('run', {
   *     init(run) {
   *       run.option('--help');
   *     }
   *   });
   */
  init?(schema: Schema<T>): void;
  /**
   * Serves as a fallback for parsed arguments that cannot be
   * recognized using the list of configured options and commands.
   * Can have the following return values:
   *
   * - `Schema`s - Treated as options or commands.
   * If the option or command (or for arrays, the last option or command)
   * is a non-leaf node, the next arguments will be parsed using that node.
   * - `Value`s - Treated as value arguments and will be saved to either the
   * current parent or child option or command depending on their provided options.
   * - `false` - The argument is ignored as if it was never parsed.
   * - Empty array, `true`, `undefined` - Fallback to the default behavior
   * where the parsed argument may be treated either as a value or
   * an unrecognized argument depending on the provided options.
   * @param arg The parsed argument.
   * @param ctx The callback context.
   * @returns The schemas or values if any.
   * @example
   * import command, { isOption, option } from 'argstree';
   *
   * const cmd = command({
   *   strict: true,
   *   parser(arg) {
   *     // return an option when '--option' is matched
   *     if (arg.key === '--option') {
   *       return option({ args: arg.value });
   *     }
   *     // allow negative numbers in strict mode
   *     if (isOption(arg.key, 'short') && !isNaN(Number(arg.key))) {
   *       return { args: arg.key, strict: false };
   *     }
   *   }
   * });
   */
  parser?(
    arg: Arg,
    ctx: Context<T>
  ): XOR<Schema<T>, Value> | XOR<Schema<T>, Value>[] | boolean | void;
  /**
   * Called when the node is created with its initial arguments.
   * @param ctx The callback context.
   */
  onCreate?(ctx: Context<T>): void;
  /**
   * Called when the node receives an argument.
   * @param ctx The callback context.
   */
  onArg?(ctx: Context<T>): void;
  /**
   * Called when the node receives an option or command child node.
   * @param ctx The callback context.
   */
  onChild?(ctx: Context<T>): void;
  /**
   * Called when all nodes of the same depth have been created.
   * @param ctx The callback context.
   */
  onDepth?(ctx: Context<T>): void;
  /**
   * Called after the node has received all arguments and direct child nodes that it can have.
   * @param ctx The callback context.
   */
  onData?(ctx: Context<T>): void;
  /**
   * Called once all nodes have been parsed and before any validation checks.
   * @param ctx The callback context.
   */
  onBeforeValidate?(ctx: Context<T>): void;
  /**
   * Called after throwing any validation errors for the node.
   * @param ctx The callback context.
   */
  onValidate?(ctx: Context<T>): void;
}
