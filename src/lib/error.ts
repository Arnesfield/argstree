import { Node } from '../types/node.types';

/** The parse error. */
export class ParseError<T> extends Error {
  /** The option or command did not satisfy the required number of arguments. */
  static readonly RANGE_ERROR = 'RANGE';
  /** The option or command cannot be recognized. */
  static readonly UNRECOGNIZED_ERROR = 'UNRECOGNIZED';

  name = 'ParseError';

  /**
   * The parse error.
   * @param code The error code.
   * - {@linkcode ParseError.RANGE_ERROR}
   * - {@linkcode ParseError.UNRECOGNIZED_ERROR}
   * @param message The error message.
   * @param node The node object.
   */
  constructor(
    public code: string,
    message: string,
    public node: Node<T>
  ) {
    super(message);
  }
}
