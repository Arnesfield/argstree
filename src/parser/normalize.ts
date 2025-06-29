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
  /** Safe alias map object for short options. */
  readonly short: { [aliasCharCode: number]: Alias<T> };
}

export type NormalizedOptions<T> =
  | BaseNormalizedOptions<T>
  | ({ readonly pure: true } & Partial<Omit<BaseNormalizedOptions<T>, 'pure'>>);

export function normalize<T>(cfg: Config<T>): NormalizedOptions<T> {
  // if explicit leaf node, skip normalizing
  if (cfg.options.leaf) return { pure: true };

  const map: Config<T>['map'] = { __proto__: null!, ...cfg.map };
  const alias: BaseNormalizedOptions<T>['alias'] = { __proto__: null! };
  const short = { __proto__: null } as BaseNormalizedOptions<T>['short'];

  // check if node is value only (no child nodes)
  let pure = !cfg.options.parser;

  // apply aliases from args
  for (const key in map) {
    pure = false;

    // NOTE: reuse `cfg` variable
    for (let arr of array((cfg = map[key]).options.alias)) {
      // each array item is an alias
      // if `arr` is an array, then `arr[0]` is an alias
      if ((arr = array(arr)).length === 0) continue;

      // override existing alias
      const a = arr[0];
      alias[a] = { key, alias: a, args: arr.slice(1), cfg };

      // check if single character short option
      // 45: '-'
      let c: number;
      if (
        a.length === 2 &&
        a.charCodeAt(0) === 45 &&
        (c = a.charCodeAt(1)) !== 45
      ) {
        short[c] = alias[a];
      }
    }
  }

  return { pure, map, alias, short };
}
