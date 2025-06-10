import { Schema } from '../types/schema.types';
import { array } from '../utils/array';

export function getArgs<T>(
  schema: Schema<T>, // only to get options.args
  args?: string[],
  value?: string | null
): string[] {
  const a = array(schema.options.args, true);
  args && a.push(...args);
  value != null && a.push(value);
  return a;
}
