import { isOption } from '../lib/is-option';
import { Arg } from '../types/arg.types';
import { Schema, SchemaMap } from '../types/schema.types';
import { array } from '../utils/array';

// NOTE: internal

export interface Alias extends Pick<Arg, 'key'> {
  /** Alias name. */
  alias: string;
  /** Alias arguments. */
  args: string[];
}

export interface NormalizedOptions<T> {
  /** Safe schema map object. */
  readonly map: Partial<SchemaMap<T>>;
  /** Safe alias map object. */
  readonly alias: { [alias: string]: Alias };
  /** A sorted list of splittable alias keys without the `-` prefix. */
  readonly keys: string[];
}

export function normalize<T>(schema: Schema<T>): NormalizedOptions<T> {
  // initialize schema args before anything else
  const map: SchemaMap<T> = { __proto__: null!, ...schema.schemas() };

  // save splittable aliases to keys array
  const keys: string[] = [];
  const alias: NormalizedOptions<T>['alias'] = { __proto__: null! };

  // apply aliases from args
  for (const [key, s] of Object.entries(map)) {
    for (let arr of array(s.options.alias)) {
      // each array item is an alias
      // if item is an array, item[0] is an alias
      if ((arr = array(arr)).length === 0) continue;

      // use `alias[0]` as alias id and `arg` as arg
      const a = arr[0];

      // only add key if it doesn't exist in alias map yet
      // accept short options only for splitting and remove `-` prefix
      !alias[a] && isOption(a, 'short') && keys.push(a.slice(1));

      // override existing alias
      alias[a] = { key, alias: a, args: arr.slice(1) };
    }
  }

  // sort by length desc for splitting later on
  keys.sort((a, b) => b.length - a.length);

  return { map, alias, keys };
}
