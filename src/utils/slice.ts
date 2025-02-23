import { Split } from '../core/split.js';

// NOTE: internal

export function slice(value: string, matches: string[], index = 0): Split {
  const values: string[] = [];
  const remainder: string[] = [];
  if (index < matches.length) {
    const match = matches[index];
    // get leftover values (or parts) from recursive calls
    value.split(match).forEach((part, idx) => {
      // save the match in between parts
      if (idx > 0) {
        values.push(match);
      }
      if (part) {
        const result = slice(part, matches, index + 1);
        values.push(...result.values);
        remainder.push(...result.remainder);
      }
    });
  } else if (value) {
    // save leftover
    remainder.push(value);
  }
  return { values, remainder };
}
