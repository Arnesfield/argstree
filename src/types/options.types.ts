/* eslint-disable @typescript-eslint/no-unused-vars */
import { ParseError } from '../lib/error';
import { Schema } from '../schema/schema.types';
import { Arg, Node, NodeType } from './node.types';

/** The options object. */
export interface Options {
  /**
   * The option or command ID that will show up in {@linkcode Node.id}.
   * If not provided, the default value is the {@linkcode Node.key}.
   *
   * This is never used in any internal logic, but it can be
   * useful for identifying the option or command after parsing.
   */
  id?: string | null;
  /**
   * The display name of the option or command for errors. If not provided,
   * the {@linkcode Node.key} is used as the display name when available.
   */
  name?: string;
  /**
   * The initial arguments for the option or command.
   * Note that this is not a default value and additional
   * arguments will be added on top of this initial list.
   */
  args?: string | string[];
  /**
   * The alias, list of aliases, or list of aliases with arguments
   * for the option or command.
   * @example
   * const cmd = command()
   *   .option('--help', { read: false, assign: false, alias: '-h' })
   *   .option('--flag', { read: false, alias: ['-f', ['--no-flag', '0']] })
   *   .command('run', { alias: ['r', 'rum', 'urn'] });
   */
  alias?: string | (string | string[])[];
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
   * A {@linkcode ParseError} is thrown if the option or command does not
   * satisfy this condition or if the parent option or command cannot accept
   * any more arguments.
   */
  max?: number;
  /**
   * When disabled, the option or command will not accept any arguments
   * (except for {@linkcode assign assigned} values) and are instead saved to
   * the parent option or command if it can accept arguments. Otherwise,
   * a {@linkcode ParseError} is thrown and the argument is treated as an
   * unrecognized option or command.
   * @default true
   */
  read?: boolean;
  /**
   * Determines if the option or command assignment is enabled
   * (uses the equal sign, e.g. `--option=value`, `command=value`).
   *
   * Depending on the {@linkcode NodeType}, the default value is
   * `true` for `option` types and `false` for `command` types.
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
   * @default false
   */
  strict?: boolean | 'self' | 'descendants';
  /**
   * When enabled, parsed nodes will be treated as leaf nodes (no child nodes).
   * If there are options or commands configured for the schema,
   * then this value is ignored and is always `false` (can have child nodes).
   *
   * Depending on the {@linkcode NodeType}, the default value is
   * `true` for `option` types and `false` for `command` types.
   */
  leaf?: boolean;
  /**
   * Called only once when the schema is created and is used to gain
   * a reference to the schema object to add options and/or commands.
   * @param schema The schema object.
   * @example
   * const cmd = command()
   *   .option('--help', { alias: '-h' })
   *   .command('run', {
   *     alias: 'r',
   *     init(run) {
   *       run.option('--help', { alias: '-h' });
   *       run.option('--option', { alias: '-o' });
   *     }
   *   });
   */
  init?(schema: Schema): void;
  /**
   * Serves as a fallback for parsed arguments that cannot be
   * recognized using the list of configured options and commands.
   * If no option/s or command/s are returned,
   * then the parsed argument may be treated either as a value
   * or an unrecognized argument depending on the provided options.
   * @param arg The parsed argument.
   * @param node The node object.
   * @returns The schema or multiple schemas if any.
   * @example
   * const cmd = command({
   *   handler(arg) {
   *     // return an option when '--foo' is matched
   *     if (arg.key === '--foo') {
   *       return option({ args: arg.value });
   *     }
   *   }
   * });
   */
  handler?(arg: Arg, node: Node): Schema | Schema[] | null | void;
  /**
   * Called when the node is created with its initial arguments.
   * @param node The node object.
   */
  preArgs?(node: Node): void;
  /**
   * Called after the node has received all the arguments it can have.
   * @param node The node object.
   */
  postArgs?(node: Node): void;
  /**
   * Called once all the {@linkcode postArgs} callbacks have been fired
   * for all the parsed nodes and before throwing any validation errors.
   * @param node The node object.
   */
  preValidate?(node: Node): void;
  /**
   * Called once all the {@linkcode preValidate} callbacks have been fired for
   * all the parsed nodes and after throwing any validation errors for the node.
   * @param node The node object.
   */
  postValidate?(node: Node): void;
}

/** The schema options. */
export type SchemaOptions = Omit<Options, 'alias'>;
