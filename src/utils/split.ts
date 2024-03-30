import { Split } from '../core/split.js';

// NOTE: internal. use directly for `alias.ts` since matches are already sorted

export function split(value: string, matches: string[], index = 0): Split {
  const values: string[] = [];
  const remainder: string[] = [];
  if (index < matches.length) {
    const match = matches[index];
    const parts = value.split(match);
    // get leftover values (or parts) from recursive calls
    parts.forEach((part, partIndex) => {
      if (part) {
        const result = split(part, matches, index + 1);
        values.push(...result.values);
        remainder.push(...result.remainder);
      }
      // save the match in between parts
      if (partIndex < parts.length - 1) {
        values.push(match);
      }
    });
  } else if (value) {
    // save leftover
    remainder.push(value);
  }
  return { values, remainder };
}
