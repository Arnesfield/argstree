/** The node data. */
export interface NodeData {
  /** The parsed argument. */
  raw: string | null;
  /** The alias used to parse the options for this node. Otherwise, this value is `null`. */
  alias: string | null;
  /** The arguments for this node. */
  args: string[];
  /** The options for this node. */
  options: Options;
}

/** The ArgsTree options. */
export interface Options {
  /**
   * Unique ID for this option or command.
   *
   * Pass a function to transform the raw argument and
   * use the return value as the ID (e.g. transform to camelCase).
   *
   * This is never used in any internal logic, but can
   * be useful for finding the exact node after parsing.
   */
  id?:
    | string
    | ((raw: string | null, data: NodeData) => string | null | undefined);
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
   * assigned value as an argument for this option or command.
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
   * When enabled, an error is thrown for unrecognized options
   * that are not provided in {@linkcode args}.
   *
   * By default, this is set to `false` for the root node. If not explicitly
   * provided, this option is inherited from the parent option or command.
   */
  strict?: boolean;
  /**
   * Enable assignment with equal sign (`=`) for this option or command and its aliases.
   *
   * This option does not apply for the root node.
   *
   * e.g. `--flag=value`, `command=value`
   *
   * By default, this option is set to `true` if the parsed argument
   * is an alias or an option (e.g. `-f`, `--flag`).
   */
  assign?: boolean;
  /**
   * Initial arguments for this option or command.
   *
   * Note that this is not a default value.
   * Additional arguments will be added on top of this initial list.
   */
  initial?: string[];
  /**
   * List of aliases mapped to {@linkcode args}.
   *
   * For multiple alias arguments, use a string array where
   * the first element string is a valid option or command
   * and the rest are arguments for the said option or command.
   *
   * ```javascript
   * ['--flag', 'arg1', 'arg2', ...]
   * ```
   *
   * For multiple options or commands with their own arguments,
   * use an array of string arrays of similar condition.
   *
   * ```javascript
   * [
   *   ['--flag', 'arg1', 'arg2', ...],
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
  /** The arguments to match that will be parsed as options or commands. */
  args?:
    | { [arg: string]: Options | null | undefined }
    | ((arg: string, data: NodeData) => Options | null | undefined);
  /**
   * Validate arguments after they are saved for this option or command.
   * Return a boolean or throw an error manually.
   * @param data The node data.
   * @return A validate error is thrown when `false` is returned.
   */
  validate?(data: NodeData): boolean;
}

/** The node object. */
export interface Node extends Omit<NodeData, 'options'> {
  /** The provided {@linkcode Options.id} or the parsed argument. */
  id: string | null;
  /** The provided {@linkcode Options.name}. */
  name: string | null;
  /** Depth of node. */
  depth: number;
  /** The parent node. If `null`, then this is the root node. */
  parent: Node | null;
  /** The direct children nodes. */
  children: Node[];
  /** The ancestor nodes starting from the root node to the parent node. */
  ancestors: Node[];
  /** The descendant nodes starting from the children nodes down to the leaf nodes. */
  descendants: Node[];
}
