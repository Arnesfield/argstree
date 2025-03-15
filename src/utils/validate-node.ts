import { ParseError } from '../core/error.js';
import { Range } from '../parser/normalize.js';
import { NodeData } from '../types/node.types.js';
import { display } from './display.js';

export function validateNode(
  data: NodeData,
  range: Pick<Range, 'min' | 'max'>
): void | never {
  // validate assumes the node has lost reference
  // so validate range here, too
  const len = data.args.length;
  const { min, max } = range;
  const msg: [string | number, number] | null =
    min != null && max != null && (len < min || len > max)
      ? min === max
        ? [min, min]
        : [`${min}-${max}`, 2]
      : min != null && len < min
        ? [`at least ${min}`, min]
        : max != null && len > max
          ? [max && `up to ${max}`, max]
          : null;
  if (msg) {
    const name = display(data);
    throw new ParseError(
      ParseError.RANGE_ERROR,
      (name ? name + 'e' : 'E') +
        `xpected ${msg[0]} argument${msg[1] === 1 ? '' : 's'}, but got ${len}.`,
      data
    );
  }
}
