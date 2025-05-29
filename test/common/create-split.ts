import { Split } from '../../src';

/**
 * Creates split result from items.
 * @param items Prefix string with `:` for remainders.
 * @returns The split result.
 */
export function createSplit(items: string[]): Split {
  const s: Split = { items: [], values: [], remainder: [] };
  for (const item of items) {
    const remainder = item.startsWith(':');
    const value = remainder ? item.slice(1) : item;
    (remainder ? s.remainder : s.values).push(value);
    s.items.push({ value, remainder });
  }
  return s;
}
