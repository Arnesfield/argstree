import { Node } from '../types/node.types';
import { Options } from '../types/options.types';

/** The parse error. */
export class ParseError<T = unknown> extends Error {
  /** The option or command did not satisfy the required number of arguments. */
  static readonly RANGE_ERROR = 'RANGE';
  /** The parsed alias cannot be recognized. */
  static readonly UNRECOGNIZED_ALIAS_ERROR = 'UNRECOGNIZED_ALIAS';
  /** The option or command cannot be recognized. */
  static readonly UNRECOGNIZED_ARGUMENT_ERROR = 'UNRECOGNIZED_ARGUMENT';

  name = 'ParseError';

  /**
   * The parse error.
   * @param code The error code.
   * - {@linkcode ParseError.RANGE_ERROR}
   * - {@linkcode ParseError.UNRECOGNIZED_ALIAS_ERROR}
   * - {@linkcode ParseError.UNRECOGNIZED_ARGUMENT_ERROR}
   * @param message The error message.
   * @param node The node object.
   * @param options The schema options.
   */
  constructor(
    public code: string,
    message: string,
    public node: Node<T>,
    public options: Options<T>
  ) {
    super(message);
  }
}
