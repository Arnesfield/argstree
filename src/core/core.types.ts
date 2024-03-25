/**
 * ArgsTree options.
 */
export interface Options {
  /**
   * Unique ID for this option or command.
   *
   * This is never used in any internal logic, but can
   * be useful for finding the exact node after parsing.
   */
  id?: string;
  /**
   * Display name of option or command for errors.
   *
   * If not provided, the raw argument is used as the display name when available.
   */
  name?: string;
  /**
   * Required number of arguments to read before the next parsed option or command.
   *
   * An error is thrown if this option or command does not satisfy this condition.
   */
  min?: number | null;
  /**
   * Maximum number of arguments to read before the next parsed option or command.
   *
   * Arguments over the maximum limit are saved as
   * arguments for the parent option or command instead.
   *
   * Direct assignment with `=` will always read the
   * assigned value as an argument for the option or command.
   *
   * An error is thrown if this option or command does not satisfy this condition.
   */
  max?: number | null;
  /**
   * Similar to the {@linkcode max} option but does not throw an error.
   *
   * If not provided, the value for {@linkcode max} is used instead.
   *
   * This takes priority over the {@linkcode max} option
   * when reading arguments, but the {@linkcode max} option
   * is still used for validating the maximum number of arguments.
   */
  maxRead?: number | null;
  /**
   * Enable assignment with equal sign (`=`) for this option or command and its aliases.
   *
   * This option does not apply for the root node.
   *
   * e.g. `--foo=value`, `foo=value`
   *
   * By default, this option is set to `true` if the parsed argument starts with a dash (`-`).
   */
  assign?: boolean;
  /**
   * List of aliases mapped to {@linkcode args}.
   *
   * For multiple alias arguments, use a string array where
   * the first element string is a valid option or command
   * and the rest are arguments for the said option or command.
   *
   * ```javascript
   * ['--foo', 'arg1', 'arg2', ...]
   * ```
   *
   * For multiple options or commands with their own arguments,
   * use an array of string arrays of similar condition.
   *
   * ```javascript
   * [
   *   ['--foo', 'arg1', 'arg2', ...],
   *   ['command', 'arg1', 'arg2', ...],
   *   ...
   * ]
   * ```
   */
  alias?: {
    [alias: string]:
      | string
      | [string, ...string[]]
      | [[string, ...string[]], ...[string, ...string[]][]]
      | null
      | undefined;
  };
  /**
   * The arguments to match that will be parsed as options or commands.
   */
  args?:
    | { [arg: string]: Options | null | undefined }
    | ((arg: string) => Options | null | undefined);
  /**
   * Validate arguments after they are saved for this option or command.
   * Return a boolean or throw an error manually.
   * @param data Node data.
   * @return A validate error is thrown when `false` is returned.
   */
  validate?(data: {
    /**
     * The parsed argument.
     */
    raw: string | null;
    /**
     * The arguments for this node.
     */
    args: string[];
    /**
     * The options for this node.
     */
    options: Options;
  }): boolean;
}

/**
 * The Node object.
 */
export interface Node {
  /**
   * The provided {@linkcode Options.id} or the parsed argument.
   */
  id: string | null;
  /**
   * The provided {@linkcode Options.name}.
   */
  name: string | null;
  /**
   * The parsed argument.
   */
  raw: string | null;
  /**
   * Depth of node.
   */
  depth: number;
  /**
   * The arguments for this node.
   */
  args: string[];
  /**
   * The parent node. If `null`, then this node is the root node.
   */
  parent: Node | null;
  /**
   * The direct children nodes.
   */
  children: Node[];
  /**
   * The ancestor nodes starting from the root node to the parent node.
   */
  ancestors: Node[];
  /**
   * The descendant nodes starting from the children nodes down to the leaf nodes.
   */
  descendants: Node[];
}
