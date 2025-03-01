import { NodeOptions } from '../lib/node.js';
import { isAlias } from '../utils/arg.utils.js';
import { ensureNumber } from '../utils/ensure-number.js';
import { error } from '../utils/error.utils.js';
import { display } from '../utils/options.utils.js';
import { Alias, Args, NodeData, Options } from './core.types.js';
import { ParseError } from './error.js';

export interface NormalizedArgs {
  [arg: string]: NormalizedOptions;
}

export interface NormalizedAliases {
  [alias: string]:
    | [[string, ...string[]], ...[string, ...string[]][]]
    | null
    | undefined;
}

export interface NormalizeOptions extends Omit<NodeOptions, 'options'> {
  src: Options | true;
}

export interface MakeOptions extends Omit<NodeOptions, 'options'> {
  src: Options;
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

  readonly data: NodeData;
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

  function mkdata(options: MakeOptions): NodeData {
    const { src, raw = null, key = null, alias = null } = options;
    const args = (src.initial || []).concat(options.argv || []);
    return { raw, key, alias, args, options: src };
  }

  function make(options: MakeOptions) {
    const data = mkdata(options);

    // get and validate range only after setting the fields above
    const { src } = options;
    type R = NormalizedOptions['range'];
    const range: R = { min: ensureNumber(src.min), max: ensureNumber(src.max) };
    range.maxRead = ensureNumber(src.maxRead) ?? range.max;

    // if no max, skip all checks as they all require max to be provided
    const { min, max, maxRead } = range;
    const msg =
      max == null
        ? null
        : min != null && min > max
          ? `min and max range: ${min}-${max}`
          : maxRead != null && max < maxRead
            ? `max and maxRead range: ${max} >= ${maxRead}`
            : null;
    if (msg) {
      const name = display(data);
      error(
        data,
        ParseError.INVALID_OPTIONS_ERROR,
        (name ? name + 'has i' : 'I') + `nvalid ${msg}.`
      );
    }

    const entries = Object.entries(src.args || {});
    const opts: NormalizedOptions = {
      branch: !!(src.args || src.handler),
      fertile: !!(src.handler || entries.length > 0),
      data,
      src,
      args: { __proto__: null, ...src.args },
      aliases: { __proto__: null },
      names: [],
      range
    };
    map.set(src, opts);

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
            const name = display({ key: arg, options: value });
            error(
              data,
              ParseError.INVALID_OPTIONS_ERROR,
              name
                ? name + `cannot use an existing alias: ${key}`
                : `Alias '${key}' already exists.`
            );
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
  }

  return (opts: NormalizeOptions): NodeOptions => {
    // convert src options to object
    // NOTE: directly mutate since we probably won't need to reference opts again
    opts.src = typeof opts.src === 'object' ? opts.src : (o ||= {});
    return { ...opts, options: map.get(opts.src) || make(opts as MakeOptions) };
  };
}
