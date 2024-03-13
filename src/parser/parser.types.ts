export enum ParsedType {
  Value,
  Match
}

export interface Parsed {
  /**
   * The argument string.
   */
  arg: string;
  /**
   * Determines whether the {@linkcode arg} is treated as a value or an option/command.
   *
   * If {@linkcode arg} is treated as a value,
   * it is saved as an argument for the child node.
   */
  type?: ParsedType;
}
