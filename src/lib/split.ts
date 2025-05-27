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
  remainder: string[];
}

/**
 * Splits the string based on the provided matches in order.
 *
 * Consider sorting the {@linkcode matches} array by length
 * in descending order to ensure that longer matches are split first.
 * @param value The string to split.
 * @param matches The list of matches.
 * @returns The split result.
 */
export function split(value: string, matches: string[]): Split {
  // like SplitItem but with partial remainder and index
  interface StackItem
    extends Pick<SplitItem, 'value'>,
      Partial<Pick<SplitItem, 'remainder'>> {
    index?: number;
  }

  const s: Split = { items: [], values: [], remainder: [] };
  const stack: StackItem[] = [];
  value && stack.push({ value, index: 0 });

  let item;
  while ((item = stack.pop())) {
    if (item.index == null) {
      s.items.push(item as SplitItem);
      s.values.push(item.value);
    } else if (item.index > matches.length - 1) {
      // reuse current item object (convert to SplitItem)
      delete item.index;
      item.remainder = true;
      s.items.push(item as SplitItem);
      s.remainder.push(item.value);
    } else {
      // increment index to be used for new remaining split items
      const match = matches[item.index++];
      const strs = item.value.split(match);
      type I = SplitItem;

      // push into stack to process
      for (let i = strs.length - 1; i >= 0; i--) {
        const str = strs[i];
        str && stack.push({ value: str, index: item.index });
        i > 0 && stack.push({ value: match, remainder: false } satisfies I);
      }
    }
  }

  return s;
}
