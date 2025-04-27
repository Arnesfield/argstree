/** The parsed argument. */
export interface Arg {
  /** The unparsed argument. */
  raw: string;
  // NOTE: same doc as Node.key
  /** The parsed key from the argument (e.g. `--option` from `--option=value`). */
  key: string;
  /** The parsed value from the argument (e.g. `value` from `--option=value`). */
  value?: string;
}
