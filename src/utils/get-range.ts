import { Range } from '../parser/normalize.js';
import { Options } from '../types/options.types.js';
import { ensureNumber } from './ensure-number.js';

export function getRange(o: Options): Pick<Range, 'min' | 'max'> {
  return { min: ensureNumber(o.min), max: ensureNumber(o.max) };
}
