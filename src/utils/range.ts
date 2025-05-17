import { ParseError } from '../lib/error';
import { Node } from '../types/node.types';
import { Options } from '../types/options.types';
import { display } from './display';

// ensure non-negative number
function number(n: number | null | undefined): number | null {
  return typeof n === 'number' && isFinite(n) && n >= 0 ? n : null;
}

export function range<T>(
  min: number | null | undefined,
  max: number | null | undefined,
  data: Node<T> | undefined,
  src: Options<T> | undefined
): [number | null, number | null] {
  // get and validate range
  min = number(min);
  max = number(max);

  if (min != null && max != null && min > max) {
    const name = data && display(data);
    const msg =
      (name ? name + 'has i' : 'I') + `nvalid min and max range: ${min}-${max}`;
    throw new ParseError(ParseError.OPTIONS_ERROR, msg, data, src);
  }

  return [min, max];
}
