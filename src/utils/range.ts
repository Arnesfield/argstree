import { ParseError } from '../lib/error';
import { Schema } from '../schema/schema.types';
import { Node } from '../types/node.types';
import { display } from './display';

// ensure non-negative number
function number(n: number | null | undefined): number | null {
  return typeof n === 'number' && isFinite(n) && n >= 0 ? n : null;
}

export function range<T>(
  min: number | null | undefined,
  max: number | null | undefined,
  schema: Schema<T>,
  node: Node<T> | undefined
): [number | null, number | null] {
  // get and validate range
  min = number(min);
  max = number(max);

  if (min != null && max != null && min > max) {
    const name = node && display(node);
    const msg =
      (name ? name + 'has i' : 'I') + `nvalid min and max range: ${min}-${max}`;
    throw new ParseError(ParseError.OPTIONS_ERROR, msg, schema, node);
  }

  return [min, max];
}
