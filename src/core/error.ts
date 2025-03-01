import { NodeData, Options } from './core.types.js';

/** The parse error options. */
export interface ParseErrorOptions extends NodeData {
  /**
   * The reason error string.
   * - {@linkcode ParseError.INVALID_OPTIONS_ERROR}
   * - {@linkcode ParseError.INVALID_RANGE_ERROR}
   * - {@linkcode ParseError.UNRECOGNIZED_ALIAS_ERROR}
   * - {@linkcode ParseError.UNRECOGNIZED_ARGUMENT_ERROR}
   */
  reason: string;
  /** The error message. */
  message: string;
}

/** The parse error object. */
export interface ParseErrorObject extends ParseErrorOptions {
  /** The error name. */
  name: string;
}

/** The parse error. */
export class ParseError extends Error implements ParseErrorObject {
  /** The {@linkcode Options} object provided is not valid (e.g. incorrect range). */
  static readonly INVALID_OPTIONS_ERROR = 'invalid-options';
  /** The option or command did not satisfy the required number of arguments. */
  static readonly INVALID_RANGE_ERROR = 'invalid-range';
  /** After an alias is parsed that cannot be recognized. */
  static readonly UNRECOGNIZED_ALIAS_ERROR = 'unrecognized-alias';
  /** The option or command cannot be recognized. */
  static readonly UNRECOGNIZED_ARGUMENT_ERROR = 'unrecognized-argument';

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

  toJSON(): ParseErrorObject {
    return {
      name: this.name,
      reason: this.reason,
      message: this.message,
      raw: this.raw,
      key: this.key,
      alias: this.alias,
      args: this.args,
      options: this.options
    };
  }
}
