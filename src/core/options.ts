import { isAlias } from '../utils/arg.utils.js';
import { ensureNumber } from '../utils/ensure-number.js';
import { Alias, Args, Options } from './core.types.js';

export interface NormalizedArgs {
  [arg: string]: NormalizedOptions;
}

export interface NormalizedAliases {
  [alias: string]:
    | [[string, ...string[]], ...[string, ...string[]][]]
    | null
    | undefined;
}

export interface NormalizedOptions {
  /**
   * Determines if the Node is not a leaf node
   * and should be treated as a new parent node.
   */
  readonly branch: boolean;

  /** Determines if the Node can actually have children. */
  readonly fertile: boolean;

  readonly src: Options;

  /** Args without prototype. */
  readonly args: Args;

  readonly aliases: NormalizedAliases;

  /** A sorted list of splittable alias names without the `-` prefix. */
  readonly names: string[];

  readonly range: {
    min?: number | null;
    max?: number | null;
    maxRead?: number | null;
  };
}

function getArgs(alias: Alias | null | undefined) {
  /** List of strings in `args`. */
  let strs: [string, ...string[]] | undefined;
  const list: [string, ...string[]][] = [];
  const args =
    typeof alias === 'string' ? [alias] : Array.isArray(alias) ? alias : [];

  for (const arg of args) {
    if (typeof arg === 'string') {
      if (!strs?.push(arg)) {
        list.push((strs = [arg]));
      }
    } else if (Array.isArray(arg) && arg.length > 0) {
      // filter out empty array
      list.push(arg);
    }
  }

  return list;
}

export function normalizer() {
  // fallback for `true` options to reuse existing normalized options
  let o: Options | undefined;
  const map = new WeakMap<Options, NormalizedOptions>();

  return (src: Options | true): NormalizedOptions => {
    const exists = map.get((src = typeof src === 'object' ? src : (o ||= {})));
    if (exists) {
      return exists;
    }

    const entries = Object.entries(src.args || {});
    const range: NormalizedOptions['range'] = {};
    const opts: NormalizedOptions = {
      branch: !!(src.args || src.handler),
      fertile: !!(src.handler || entries.length > 0),
      src,
      args: { __proto__: null, ...src.args },
      aliases: { __proto__: null },
      names: [],
      range
    };
    map.set(src, opts);

    // get and validate range only after setting the fields above
    range.min = ensureNumber(src.min);
    range.max = ensureNumber(src.max);
    range.maxRead = ensureNumber(src.maxRead) ?? range.max;
    const { min, max, maxRead } = range;
    // if no max, skip all checks as they all require max to be provided
    const message =
      max == null
        ? null
        : min != null && min > max
          ? `min and max range: ${min}-${max}`
          : maxRead != null && max < maxRead
            ? `max and maxRead range: ${max} >= ${maxRead}`
            : null;
    if (message) {
      // TODO: error
      throw new Error(`Invalid ${message}.`);
      // const name = this.name();
      // this.error(
      //   ArgsTreeError.INVALID_OPTIONS_ERROR,
      //   (name ? name + 'has i' : 'I') + `nvalid ${message}.`
      // );
    }

    function setAlias(
      key: string,
      args: NonNullable<NormalizedAliases[string]>
    ) {
      opts.aliases[key] = args;
      // skip command aliases since we don't need to split them
      // and remove `-` prefix
      isAlias(key) && opts.names.push(key.slice(1));
    }

    // apply aliases
    for (const [arg, alias] of Object.entries(src.aliases || {})) {
      const args = getArgs(alias);
      if (args.length > 0) {
        setAlias(arg, args as NonNullable<NormalizedAliases[string]>);
      }
    }

    // apply aliases from args
    for (const [arg, value] of entries) {
      if (!value || typeof value !== 'object') {
        continue;
      }

      const { alias } = value;
      // use `alias[0]` as alias and `arg` as arg
      const aliases =
        typeof alias === 'string' ? [alias] : Array.isArray(alias) ? alias : [];
      for (const item of aliases) {
        // each item is an alias
        // if item is an array, item[0] is an alias
        const arr =
          typeof item === 'string' ? [item] : Array.isArray(item) ? item : [];
        if (arr.length > 0) {
          const key = arr[0];
          if (opts.aliases[key]) {
            // TODO: error
            throw new Error(`Alias '${key}' already exists.`);
          }
          setAlias(key, [[arg].concat(arr.slice(1))] as [
            [string, ...string[]]
          ]);
        }
      }
    }

    // sort by length desc for splitting later on
    opts.names.sort((a, b) => b.length - a.length);
    return opts;
  };
}
