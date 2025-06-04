import { Split } from '../lib/split';

/** The parsed argument. */
export interface Arg {
  /** The unparsed argument. */
  raw: string;
  /** The parsed key from the argument (e.g. `--option` from `--option=value`). */
  key: string;
  // NOTE: same doc as Node.value
  /** The parsed value from the argument (e.g. `value` from `--option=value`). */
  value?: string;
  /** The split result with remaining values if the key looks like a short option (e.g. `-abc`). */
  split?: Split;
}
