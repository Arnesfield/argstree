import { NodeData } from '../types/node.types.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Options } from '../types/options.types.js';

/** The parse error. */
export class ParseError extends Error {
  /**
   * The {@linkcode Options} object provided is invalid
   * (e.g. incorrect range config or duplicate aliases).
   */
  static readonly OPTIONS_ERROR = 'options';
  /** The option or command did not satisfy the required number of arguments. */
  static readonly RANGE_ERROR = 'range';
  /** The parsed alias cannot be recognized. */
  static readonly UNRECOGNIZED_ALIAS_ERROR = 'unrecognized-alias';
  /** The option or command cannot be recognized. */
  static readonly UNRECOGNIZED_ARGUMENT_ERROR = 'unrecognized-argument';

  /**
   * The reason for error.
   * - {@linkcode ParseError.OPTIONS_ERROR}
   * - {@linkcode ParseError.RANGE_ERROR}
   * - {@linkcode ParseError.UNRECOGNIZED_ALIAS_ERROR}
   * - {@linkcode ParseError.UNRECOGNIZED_ARGUMENT_ERROR}
   */
  readonly reason: string;
  /** The node data. */
  readonly data: NodeData;

  /**
   * The parse error.
   * @param reason The reason for error. See {@linkcode ParseError.reason} for details.
   * @param message The error message.
   * @param data The node data.
   */
  constructor(reason: string, message: string, data: NodeData) {
    super(message);
    this.name = 'ParseError';
    this.reason = reason;
    this.data = data;
  }
}
