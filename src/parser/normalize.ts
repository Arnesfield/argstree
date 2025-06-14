import { isOption } from '../lib/is-option';
import { Arg } from '../types/arg.types';
import { Config } from '../types/schema.types';
import { array } from '../utils/array';

// NOTE: internal

export interface Alias<T> extends Readonly<Pick<Arg, 'key'>> {
  /** Alias name. */
  readonly alias: string;
  /** Alias arguments. */
  readonly args: string[];
  /** The schema config. */
  readonly cfg: Config<T>;
}

export interface BaseNormalizedOptions<T> {
  /** Determines if the node cannot actually have child nodes (value only or leaf node). */
  readonly pure: boolean | undefined;
  /** Safe config map object. */
  readonly map: Partial<Required<Config<T>>['map']>;
  /** Safe alias map object. */
  readonly alias: { [alias: string]: Alias<T> };
  /** A sorted list of splittable alias keys without the `-` prefix. */
  readonly keys: string[];
}

export type NormalizedOptions<T> =
  | BaseNormalizedOptions<T>
  | ({ readonly pure: true } & Partial<Omit<BaseNormalizedOptions<T>, 'pure'>>);

export function normalize<T>(cfg: Config<T>): NormalizedOptions<T> {
  // if explicit leaf node, skip normalizing
  if (cfg.options.leaf) return { pure: true };

  const map: Config<T>['map'] = { __proto__: null!, ...cfg.map };

  // save splittable aliases to keys array
  const keys: string[] = [];
  const alias: NormalizedOptions<T>['alias'] = { __proto__: null! };

  // check if node is value only (no child nodes)
  let pure = !cfg.options.parser;

  // apply aliases from args
  for (const key in map) {
    pure = false;

    // NOTE: reuse `cfg` variable
    for (let arr of array((cfg = map[key]).options.alias)) {
      // each array item is an alias
      // if item is an array, item[0] is an alias
      if ((arr = array(arr)).length === 0) continue;

      // use `alias[0]` as alias id and `arg` as arg
      const a = arr[0];

      // only add key if it doesn't exist in alias map yet
      // accept short options only for splitting and remove `-` prefix
      !alias[a] && isOption(a, 'short') && keys.push(a.slice(1));

      // override existing alias
      alias[a] = { key, alias: a, args: arr.slice(1), cfg };
    }
  }

  // sort by length desc for splitting later on
  keys.sort((a, b) => b.length - a.length);

  return { pure, map, alias, keys };
}
