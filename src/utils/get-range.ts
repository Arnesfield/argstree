import { Range } from '../parser/normalize.js';
import { Options } from '../types/options.types.js';
import { number } from './number.js';

export function getRange(o: Options): Pick<Range, 'min' | 'max'> {
  return { min: number(o.min), max: number(o.max) };
}
