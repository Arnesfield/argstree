export interface Parsed {
  /**
   * The argument string.
   */
  arg: string;
  /**
   * Determines whether the {@linkcode arg} is treated
   * as a value (`true`) or an option/command/non-strict value (`false`).
   *
   * If {@linkcode arg} is treated as a value,
   * it is saved as an argument for the child node.
   */
  raw?: boolean;
}
