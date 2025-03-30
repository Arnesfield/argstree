/* eslint-disable @typescript-eslint/no-unused-vars */
import { ParseError } from '../core/error.js';
import { Schema } from '../schema/schema.types.js';
import { Arg, Node, NodeData, NodeType } from './node.types.js';

/** The schema options. */
export interface SchemaOptions {
  /**
   * The option or command ID that will show up in {@linkcode Node.id}.
   * If a function is provided, the return value will be used as the ID.
   * If the value is not provided, it defaults to the {@linkcode Node.key}.
   *
   * This is never used in any internal logic, but it can be
   * useful for identifying the option or command after parsing.
   */
  id?: string | null | ((data: NodeData) => string | null | void);
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
  args?: string[];
  /**
   * The minimum number of arguments to read before the next parsed option or command.
   *
   * A {@linkcode ParseError} is thrown if the option or command
   * does not satisfy this condition unless {@linkcode postParse} is handled.
   */
  min?: number | null;
  /**
   * The maximum number of arguments to read before the next parsed option or command.
   * Arguments over the maximum limit are saved to the parent option or command instead.
   *
   * A {@linkcode ParseError} is thrown if the option or command
   * does not satisfy this condition unless {@linkcode postParse} is handled.
   */
  max?: number | null;
  /**
   * Similar to the {@linkcode max} option but does not throw an error.
   * If not provided, the value for {@linkcode max} is used instead.
   *
   * This takes priority over the {@linkcode max} option
   * when reading arguments, but only the {@linkcode max} option
   * is used for validating the maximum number of arguments.
   */
  maxRead?: number | null;
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
   * @param data The node data.
   * @returns The schema or multiple schemas if any.
   * @example
   * const cmd = command({
   *   handler(arg) {
   *     // return an option when '--foo' is matched
   *     if (arg.key === '--foo') {
   *       return option({ args: arg.value != null ? [arg.value] : [] });
   *     }
   *   }
   * });
   */
  handler?(arg: Arg, data: NodeData): Schema | Schema[] | null | void;
  /**
   * Called when the node data is created.
   * @param data The node data.
   */
  preData?(data: NodeData): void;
  /**
   * Called after the node data has received all the arguments it can have.
   * @param data The node data.
   */
  postData?(data: NodeData): void;
  /**
   * Called once all the {@linkcode postData} callbacks have been fired
   * for the parsed node data and just before the node object is created.
   * @param node The node data.
   */
  preParse?(data: NodeData): void;
  /**
   * Called once all the {@linkcode preParse} callbacks have been fired
   * for the parsed node data and after throwing any validation errors.
   * @param node The node object.
   */
  postParse?(node: Node): void;
}

/** The options object. */
export interface Options extends SchemaOptions {
  /**
   * Determines if the option or command assignment is enabled
   * (uses the equal sign, e.g. `--option=value`, `command=value`).
   *
   * Depending on the {@linkcode NodeType}, the default value is
   * `true` for `option` types and `false` for `command` types.
   */
  assign?: boolean;
  /**
   * The alias, list of aliases, or list of aliases with arguments
   * for the option or command.
   * @example
   * const cmd = command()
   *   .option('--help', { maxRead: 0, alias: '-h' })
   *   .option('--flag', { maxRead: 0, alias: ['-f', ['--no-flag', '0']] })
   *   .command('run', { alias: ['r', 'ru', 'urn'] });
   */
  alias?: string | (string | string[])[] | null;
}
