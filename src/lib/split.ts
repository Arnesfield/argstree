/** The split item. */
export interface SplitItem {
  /** The split value. */
  value: string;
  /** Determines if the {@linkcode value} is a remainder or not. */
  remainder: boolean;
}

/** The split result. */
export interface Split {
  /** All split items in order. */
  items: SplitItem[];
  /** The split values. */
  values: string[];
  /** The remaining values that were not matched. */
  remainders: string[];
}

// remainder items have index but no remainder prop
type StackItem =
  | (SplitItem & { index?: never })
  | (Pick<SplitItem, 'value'> & { index: number });

/**
 * Splits the string based on the provided matches in order.
 * @param value The string to split.
 * @param matches The list of matches.
 * @returns The split result.
 */
export function split(value: string, matches: string[]): Split {
  const s: Split = { items: [], values: [], remainders: [] };
  const stack: StackItem[] = [];
  value && stack.push({ value, index: 0 });

  for (let item; (item = stack.pop()); ) {
    if (item.index == null) {
      s.items.push(item);
      s.values.push(item.value);
    } else if (item.index > matches.length - 1) {
      s.items.push({ value: item.value, remainder: true });
      s.remainders.push(item.value);
    } else {
      // reuse `value` for the match value
      // increment index to be used for new remaining split items
      const strs = item.value.split((value = matches[item.index++]));

      // push into stack to process
      for (let i = strs.length - 1; i >= 0; i--) {
        const str = strs[i];
        str && stack.push({ value: str, index: item.index });
        i > 0 && stack.push({ value, remainder: false });
      }
    }
  }

  return s;
}
