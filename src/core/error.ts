import { NodeData, Options } from './core.types.js';

/** The parse error options. */
export interface ParseErrorOptions extends NodeData {
  /**
   * The reason for error.
   * - {@linkcode ParseError.OPTIONS_ERROR}
   * - {@linkcode ParseError.RANGE_ERROR}
   * - {@linkcode ParseError.UNRECOGNIZED_ALIAS_ERROR}
   * - {@linkcode ParseError.UNRECOGNIZED_ARGUMENT_ERROR}
   */
  reason: string;
  /** The error message. */
  message: string;
}

/** The parse error. */
export class ParseError extends Error implements ParseErrorOptions {
  /**
   * The {@linkcode Options} object provided is not valid
   * (e.g. incorrect range config or duplicate aliases).
   */
  static readonly OPTIONS_ERROR = 'options';
  /** The option or command did not satisfy the required number of arguments. */
  static readonly RANGE_ERROR = 'range';
  /** The parsed alias cannot be recognized. */
  static readonly UNRECOGNIZED_ALIAS_ERROR = 'unrecognized-alias';
  /** The option or command cannot be recognized. */
  static readonly UNRECOGNIZED_ARGUMENT_ERROR = 'unrecognized-argument';

  // follow order of properties in NodeData
  name = 'ParseError';
  reason!: string;
  raw!: string | null;
  key!: string | null;
  alias!: string | null;
  args!: string[];
  options!: Options;

  /**
   * The parse error.
   * @param options The error options.
   */
  constructor(options: ParseErrorOptions) {
    super(options.message);
    // assume options includes all properties (interface is implemented)
    Object.assign(this, options);
  }
}
