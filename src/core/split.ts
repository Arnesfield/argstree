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
 * will take priority and are split first.
 * @param value The combined value.
 * @param matches The list of matches to split.
 * @returns The split result.
 */
export function split(value: string, matches: string[]): Split {
  return slice(value, matches, 0, { items: [], values: [], remainder: [] });
}

function slice(str: string, matches: string[], index: number, s: Split): Split {
  if (!str) {
    // do nothing
  } else if (index < matches.length) {
    const value = matches[index];
    // get leftover values (or parts) from recursive calls
    str.split(value).forEach((part, i) => {
      // save the match in between parts
      if (i > 0) {
        s.items.push({ value, remainder: false });
        s.values.push(value);
      }

      part && slice(part, matches, index + 1, s);
    });
  } else {
    // save leftover
    s.items.push({ value: str, remainder: true });
    s.remainder.push(str);
  }

  return s;
}
