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
  // like SplitItem but with partial remainder and index
  interface InternalSplitItem
    extends Pick<SplitItem, 'value'>,
      Partial<Pick<SplitItem, 'remainder'>> {
    index?: number;
  }
  interface InternalSplit extends Omit<Split, 'items'> {
    items: InternalSplitItem[];
  }

  const s: InternalSplit = { items: [], values: [], remainder: [] };
  value && s.items.push({ value, index: 0 });

  for (let i = 0; i < s.items.length; i++) {
    const item = s.items[i];
    if (item.index == null) {
      s.values.push(item.value);
    } else if (item.index > matches.length - 1) {
      // reuse current item object (convert to SplitItem)
      delete item.index;
      item.remainder = true;
      s.remainder.push(item.value);
    } else {
      const match = matches[item.index];
      const items = item.value.split(match).flatMap((part, j) => {
        const a: InternalSplitItem[] = [];
        j > 0 && a.push({ value: match, remainder: false } as SplitItem);
        part && a.push({ value: part, index: item.index! + 1 });
        return a;
      });

      // use the same index for the next iteration
      s.items.splice(i--, 1, ...items);
    }
  }

  return s as Split;
}
