import { slice } from '../utils/slice.js';

/** Split item. */
export interface SplitItem {
  /** The split value. */
  value: string;
  /** Determines if the {@linkcode value} is a remainder or not. */
  remainder: boolean;
}

/** Split result. */
export interface Split {
  /** All split items in order. */
  items: SplitItem[];
  /** The split values. */
  values: string[];
  /** The leftover values from split. */
  remainder: string[];
}

/**
 * Split the combined value string based on the provided matches.
 *
 * Note that the {@linkcode matches} array needs to be sorted
 * by length in descending order so that longer match strings
 * take priority and are split first.
 * @param value The combined value.
 * @param matches The list of matches to split.
 * @returns The split result.
 */
export function split(value: string, matches: string[]): Split {
  return slice(value, matches);
}
