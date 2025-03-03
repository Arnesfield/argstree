import { Alias, Args, NodeData, Options } from '../core/core.types.js';
import { ParseError } from '../core/error.js';
import { isAlias } from '../utils/arg.utils.js';
import { display } from '../utils/display.utils.js';
import { ensureNumber } from '../utils/ensure-number.js';

// NOTE: internal

export type NormalizedAlias = [
  [string, ...string[]],
  ...[string, ...string[]][]
];

export interface NormalizedOptions {
  /** Determines if the Node can actually have children. */
  readonly fertile: boolean;
  readonly range: {
    min?: number | null;
    max?: number | null;
    maxRead?: number | null;
  };
  readonly src: Options;
  /** Safe args object. */
  readonly args: Args;
  /** Safe aliases object. */
  readonly aliases: { [alias: string]: NormalizedAlias | null | undefined };
  /** A sorted list of splittable alias names without the `-` prefix. */
  readonly names: string[];
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

/**
 * Create a normalizer function to normalize the provided options.
 *
 * A reference to the options object is tracked and is only ever normalized once.
 * Succeeding normalize calls will reuse existing normalized options.
 * @returns The normalize function that normalizes the provided options.
 */
export function normalizer() {
  // fallback for `true` options to reuse existing normalized options
  let o: Options | undefined;
  const map = new WeakMap<Options, NormalizedOptions>();

  return (src: Options | true | undefined): NormalizedOptions => {
    // convert src options to object
    src = typeof src === 'object' ? src : (o ||= {});

    // reuse existing normalized options
    const exists = map.get(src);
    if (exists) {
      return exists;
    }

    // get and validate range only after setting the fields above
    type R = NormalizedOptions['range'];
    const range: R = { min: ensureNumber(src.min), max: ensureNumber(src.max) };
    range.maxRead = ensureNumber(src.maxRead) ?? range.max;

    const entries = Object.entries(src.args || {});
    const opts: NormalizedOptions = {
      fertile: !!(src.handler || entries.length > 0),
      range,
      src,
      args: { __proto__: null, ...src.args },
      aliases: { __proto__: null },
      names: []
    };
    map.set(src, opts);

    function setAlias(key: string, args: NormalizedAlias) {
      opts.aliases[key] = args;
      // skip command aliases since we don't need to split them
      // and remove `-` prefix
      isAlias(key) && opts.names.push(key.slice(1));
    }

    // apply aliases
    for (const [arg, alias] of Object.entries(src.aliases || {})) {
      const args = getArgs(alias);
      if (args.length > 0) {
        setAlias(arg, args as NormalizedAlias);
      }
    }

    // apply aliases from args
    for (const [raw, options] of entries) {
      if (!options || typeof options !== 'object') {
        continue;
      }

      // use `alias[0]` as alias and `arg` as arg
      const aliases =
        typeof options.alias === 'string'
          ? [options.alias]
          : Array.isArray(options.alias)
            ? options.alias
            : [];
      for (const item of aliases) {
        // each item is an alias
        // if item is an array, item[0] is an alias
        const arr =
          typeof item === 'string' ? [item] : Array.isArray(item) ? item : [];
        if (arr.length > 0) {
          const key = arr[0];
          if (opts.aliases[key]) {
            // this node data is for current value options
            // and is not being parsed but being validated
            type N = NodeData;
            const data: N = { raw, key: raw, alias: null, options, args: [] };

            // assume that the display name always has value
            // since data.key is explicitly provided
            throw new ParseError(
              ParseError.OPTIONS_ERROR,
              `${display(data)}cannot use an existing alias: ${key}`,
              data
            );
          }

          setAlias(key, [[raw].concat(arr.slice(1))] as [
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
