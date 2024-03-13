import { Options } from '../types/core.types';

export interface ArgsTreeErrorOptions {
  cause: string;
  message: string;
  options: Options;
}

export class ArgsTreeError extends Error {
  static readonly INVALID_OPTIONS_ERROR = 'invalid-options';
  static readonly INVALID_RANGE_ERROR = 'invalid-range';
  static readonly UNRECOGNIZED_ALIAS_ERROR = 'unrecognized-alias';
  static readonly UNRECOGNIZED_ARGUMENT_ERROR = 'unrecognized-argument';

  readonly cause: string;
  readonly options: Options;

  constructor(options: ArgsTreeErrorOptions) {
    super(options.message, options);
    this.cause = options.cause;
    this.options = options.options;
  }
}
