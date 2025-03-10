import { Aliases, NodeData, Options } from '../core/core.types.js';
import { ParseError } from '../core/error.js';
import { ArgConfig, Config } from '../schema/schema.types.js';
import { isAlias } from '../utils/arg.utils.js';
import { display } from '../utils/display.utils.js';
import { ensureNumber } from '../utils/ensure-number.js';

// NOTE: internal

export type NormalizedAlias = [
  [string, ...string[]],
  ...[string, ...string[]][]
];

export interface NormalizedOptions {
  readonly type: NodeData['type'];
  /** Determines if the Node is a leaf node and cannot have descendants. */
  readonly leaf: boolean;
  /** Determines if the Node can actually have children. */
  readonly fertile: boolean;
  readonly range: {
    min?: number | null;
    max?: number | null;
    maxRead?: number | null;
  };
  readonly src: Options;
  /** Safe args object. */
  readonly args: { [arg: string]: ArgConfig | null | undefined };
  /** Same as `args` but resolved configs. */
  readonly schemas: { [arg: string]: Config | null | undefined };
  /** Safe aliases object. */
  readonly aliases: { [alias: string]: NormalizedAlias | null | undefined };
  /** A sorted list of splittable alias names without the `-` prefix. */
  readonly names: string[];
}

function getArgs(alias: Aliases[string]) {
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
      list.push(arg as [string, ...string[]]);
    }
  }

  return list;
}

type PartialPick<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// create empty node data for errors
function ndata(cfg: PartialPick<ArgConfig, 'arg'>): NodeData {
  const key = cfg.arg ?? null;
  const { type, options } = cfg;
  return { raw: key, key, alias: null, type, args: [], options };
}

export function normalize(config: Config): NormalizedOptions {
  const src = config.options;

  // get and validate range only after setting the fields above
  type R = NormalizedOptions['range'];
  const range: R = { min: ensureNumber(src.min), max: ensureNumber(src.max) };
  range.maxRead = ensureNumber(src.maxRead) ?? range.max;

  const cfgs = config.args || [];
  const fertile = !!src.handler || cfgs.length > 0;

  const opts: NormalizedOptions = {
    type: config.type,
    leaf: !fertile && (src.leaf ?? config.type === 'option'),
    fertile,
    range,
    src,
    args: { __proto__: null },
    schemas: { __proto__: null },
    aliases: { __proto__: null },
    names: []
  };

  function setAlias(cfg: Config, key: string, args: NormalizedAlias) {
    if (opts.aliases[key]) {
      const data = ndata(cfg);
      const name = display(data);
      throw new ParseError(
        ParseError.OPTIONS_ERROR,
        (name ? name + 'c' : 'C') + `annot use an existing alias: ${key}`,
        data
      );
    }

    opts.aliases[key] = args;
    // skip command aliases since we don't need to split them
    // and remove `-` prefix
    isAlias(key) && opts.names.push(key.slice(1));
  }

  // apply aliases
  for (const aliases of config.aliases || []) {
    for (const [arg, alias] of Object.entries(aliases)) {
      const args = getArgs(alias);
      args.length > 0 && setAlias(config, arg, args as NormalizedAlias);
    }
  }

  // apply args and their aliases
  for (const cfg of cfgs) {
    const { arg, options } = cfg;
    const exists = opts.args[arg];
    if (exists) {
      const data = ndata(config);
      const name = display(data);
      throw new ParseError(
        ParseError.OPTIONS_ERROR,
        (name ? name + 'c' : 'C') +
          `annot override an existing ${exists.type}: ${arg}`,
        data
      );
    }

    opts.args[arg] = cfg;

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
        setAlias(cfg, arr[0], [[arg].concat(arr.slice(1))] as [
          [string, ...string[]]
        ]);
      }
    }
  }

  // sort by length desc for splitting later on
  opts.names.sort((a, b) => b.length - a.length);
  return opts;
}
