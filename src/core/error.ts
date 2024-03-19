import { Options } from './core.types';

/**
 * The ArgsTree error options.
 */
export interface ArgsTreeErrorOptions {
  /**
   * The cause error string.
   *
   * - {@linkcode ArgsTreeError.INVALID_OPTIONS_ERROR}
   * - {@linkcode ArgsTreeError.INVALID_RANGE_ERROR}
   * - {@linkcode ArgsTreeError.UNRECOGNIZED_ALIAS_ERROR}
   * - {@linkcode ArgsTreeError.UNRECOGNIZED_ARGUMENT_ERROR}
   */
  cause: string;
  /**
   * The error message.
   */
  message: string;
  /**
   * The parsed argument.
   */
  raw: string | null;
  /**
   * The arguments for this node.
   */
  args: string[];
  /**
   * The options object related to this error (same options object reference).
   */
  options: Options;
}

/**
 * The ArgsTree error object.
 */
interface ArgsTreeErrorObject extends ArgsTreeErrorOptions {
  /**
   * The Error name.
   */
  name: string;
}

/**
 * ArgsTree error.
 */
export class ArgsTreeError extends Error {
  /**
   * The options object provided is not valid.
   *
   * e.g. Incorrect {@linkcode Options.min min} and {@linkcode Options.max max} range.
   */
  static readonly INVALID_OPTIONS_ERROR = 'invalid-options';
  /**
   * The Node does not satisfy the number of arguments.
   */
  static readonly INVALID_RANGE_ERROR = 'invalid-range';
  /**
   * After alias is parsed, it is not recognized as an alias from {@linkcode Options.alias}.
   */
  static readonly UNRECOGNIZED_ALIAS_ERROR = 'unrecognized-alias';
  /**
   * After alias is parsed, it is not recognized as
   * an option or command from {@linkcode Options.args}.
   */
  static readonly UNRECOGNIZED_ARGUMENT_ERROR = 'unrecognized-argument';

  /**
   * The cause error string.
   *
   * - {@linkcode ArgsTreeError.INVALID_OPTIONS_ERROR}
   * - {@linkcode ArgsTreeError.INVALID_RANGE_ERROR}
   * - {@linkcode ArgsTreeError.UNRECOGNIZED_ALIAS_ERROR}
   * - {@linkcode ArgsTreeError.UNRECOGNIZED_ARGUMENT_ERROR}
   */
  cause: string;
  /**
   * The parsed argument.
   */
  raw: string | null;
  /**
   * The arguments for this node.
   */
  args: string[];
  /**
   * The options object related to this error (same options object reference).
   */
  options: Options;

  /**
   * ArgsTree error.
   * @param options The error options.
   */
  constructor(options: ArgsTreeErrorOptions) {
    super(options.message, options);
    this.name = 'ArgsTreeError';
    this.cause = options.cause;
    this.raw = options.raw;
    this.args = options.args;
    this.options = options.options;
  }

  toJSON(): ArgsTreeErrorObject {
    return {
      name: this.name,
      cause: this.cause,
      message: this.message,
      raw: this.raw,
      args: this.args,
      options: this.options
    };
  }
}
