import { Split } from '../core/split.js';

// NOTE: internal

export function slice(
  value: string,
  matches: string[],
  index = 0,
  s: Split = { items: [], values: [], remainder: [] }
): Split {
  if (index < matches.length) {
    const match = matches[index];
    // get leftover values (or parts) from recursive calls
    value.split(match).forEach((part, i) => {
      // save the match in between parts
      if (i > 0) {
        s.items.push({ value: match, remainder: false });
        s.values.push(match);
      }

      part && slice(part, matches, index + 1, s);
    });
  } else if (value) {
    // save leftover
    s.items.push({ value, remainder: true });
    s.remainder.push(value);
  }

  return s;
}
