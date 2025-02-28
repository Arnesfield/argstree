import { Split } from '../core/split.js';

// NOTE: internal

export function slice(value: string, matches: string[], index = 0): Split {
  const s: Split = { items: [], values: [], remainder: [] };
  if (index < matches.length) {
    const match = matches[index];
    // get leftover values (or parts) from recursive calls
    value.split(match).forEach((part, idx) => {
      // save the match in between parts
      if (idx > 0) {
        s.items.push({ value: match, remainder: false });
        s.values.push(match);
      }
      if (part) {
        const result = slice(part, matches, index + 1);
        s.items.push(...result.items);
        s.values.push(...result.values);
        s.remainder.push(...result.remainder);
      }
    });
  } else if (value) {
    // save leftover
    s.items.push({ value, remainder: true });
    s.remainder.push(value);
  }
  return s;
}
