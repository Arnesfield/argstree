import { split as _split } from '../utils/split.js';

/** Split result. */
export interface Split {
  /** The split values. */
  values: string[];
  /** The leftover values from split. */
  remainder: string[];
}

/**
 * Split the combined value string based on the provided matches.
 * Note that longer match strings take priority and are split first.
 * @param value The combined value.
 * @param matches The list of matches to split.
 * @returns The split result.
 */
export function split(value: string, matches: string[]): Split {
  // sort matches, make sure to avoid mutation
  return _split(
    value,
    matches.slice().sort((a, b) => b.length - a.length)
  );
}
