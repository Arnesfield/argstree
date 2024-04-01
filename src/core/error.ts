import { NodeData, Options } from './core.types.js';

/** The ArgsTree error options. */
export interface ArgsTreeErrorOptions extends NodeData {
  /**
   * The cause error string.
   * - {@linkcode ArgsTreeError.VALIDATE_ERROR}
   * - {@linkcode ArgsTreeError.INVALID_OPTIONS_ERROR}
   * - {@linkcode ArgsTreeError.INVALID_RANGE_ERROR}
   * - {@linkcode ArgsTreeError.INVALID_SPEC_ERROR}
   * - {@linkcode ArgsTreeError.UNRECOGNIZED_ALIAS_ERROR}
   * - {@linkcode ArgsTreeError.UNRECOGNIZED_ARGUMENT_ERROR}
   */
  cause: string;
  /** The error message. */
  message: string;
}

/** The ArgsTree error object. */
export interface ArgsTreeErrorObject extends ArgsTreeErrorOptions {
  /** The error name. */
  name: string;
}

/** The ArgsTree error. */
export class ArgsTreeError extends Error implements ArgsTreeErrorObject {
  /** Validation failed from provided {@linkcode Options.validate} function. */
  static readonly VALIDATE_ERROR = 'validate';
  /** The {@linkcode Options} object provided is not valid (e.g. incorrect range). */
  static readonly INVALID_OPTIONS_ERROR = 'invalid-options';
  /** The option or command did not satisfy the required number of arguments. */
  static readonly INVALID_RANGE_ERROR = 'invalid-range';
  /** Failed operation for spec builder. */
  static readonly INVALID_SPEC_ERROR = 'invalid-spec';
  /** After an alias is parsed, it is not recognized as part of {@linkcode Options.alias}. */
  static readonly UNRECOGNIZED_ALIAS_ERROR = 'unrecognized-alias';
  /** The option or command is not recognized as part of {@linkcode Options.args}. */
  static readonly UNRECOGNIZED_ARGUMENT_ERROR = 'unrecognized-argument';
  /**
   * The cause error string.
   * - {@linkcode ArgsTreeError.VALIDATE_ERROR}
   * - {@linkcode ArgsTreeError.INVALID_OPTIONS_ERROR}
   * - {@linkcode ArgsTreeError.INVALID_RANGE_ERROR}
   * - {@linkcode ArgsTreeError.INVALID_SPEC_ERROR}
   * - {@linkcode ArgsTreeError.UNRECOGNIZED_ALIAS_ERROR}
   * - {@linkcode ArgsTreeError.UNRECOGNIZED_ARGUMENT_ERROR}
   */
  cause: string;
  raw: string | null;
  alias: string | null;
  args: string[];
  options: Options;

  /**
   * The ArgsTree error.
   * @param options The error options.
   */
  constructor(options: ArgsTreeErrorOptions) {
    super(options.message, options);
    this.name = this.constructor.name;
    this.cause = options.cause;
    this.raw = options.raw;
    this.alias = options.alias;
    this.args = options.args;
    this.options = options.options;
  }

  toJSON(): ArgsTreeErrorObject {
    return {
      name: this.name,
      cause: this.cause,
      message: this.message,
      raw: this.raw,
      alias: this.alias,
      args: this.args,
      options: this.options
    };
  }
}
