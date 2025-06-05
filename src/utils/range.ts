import { ParseError } from '../lib/error';
import { NodeData } from '../parser/cnode';
import { Schema } from '../types/schema.types';
import { display } from './display';

// ensure non-negative number
function number(n: number | null | undefined): number | null {
  return typeof n === 'number' && isFinite(n) && n >= 0 ? n : null;
}

export function range<T>(
  min: number | null | undefined,
  max: number | null | undefined,
  node: NodeData<T>,
  schema: Schema<T>
): [number | null, number | null] {
  // get and validate range
  min = number(min);
  max = number(max);

  if (min != null && max != null && min > max) {
    const name = display(node);
    const msg =
      (name ? name + 'has i' : 'I') + `nvalid min and max range: ${min}-${max}`;
    throw new ParseError(ParseError.OPTIONS_ERROR, msg, node, schema);
  }

  return [min, max];
}
