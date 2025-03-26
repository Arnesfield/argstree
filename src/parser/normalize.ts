import { ParseError } from '../core/error.js';
import { AliasArgs, ArgConfig, Config } from '../schema/schema.types.js';
import { NodeData, NodeType } from '../types/node.types.js';
import { Options } from '../types/options.types.js';
import { isAlias } from '../utils/arg.js';
import { display } from '../utils/display.js';
import { obj } from '../utils/obj.js';
import { ndata, NodeOptions } from './node.js';

// NOTE: internal

export interface Alias {
  /** Alias name. */
  name: string;
  args: [string, ...string[]];
}

export interface NormalizedOptions {
  /** The node type. */
  readonly type: NodeType;
  /** Determines if the Node is a leaf node and cannot have descendants. */
  readonly leaf: boolean;
  /** Determines if the Node can actually have children. */
  readonly fertile: boolean;
  /** Determines if the {@linkcode names} have no equal signs (`=`). */
  readonly safeAlias: boolean;
  /** The resolved range options. */
  readonly range: {
    min: number | null;
    max: number | null;
    maxRead: number | null;
  };
  /** The reference to the provided options. */
  readonly src: Options;
  /** Safe args object. */
  readonly args: { [arg: string]: Config | ArgConfig | undefined };
  /** Safe aliases object. */
  readonly aliases: { [alias: string]: Alias[] };
  /** A sorted list of splittable alias names without the `-` prefix. */
  readonly names: string[];
}

// ensure non-negative number
function number(n: number | null | undefined): number | null {
  return typeof n === 'number' && isFinite(n) && n >= 0 ? n : null;
}

export function normalize(opts: NodeOptions): NormalizedOptions {
  const { cfg } = opts;
  const src = cfg.options;

  // get and validate range
  const min = number(src.min);
  const max = number(src.max);
  const maxRead = number(src.maxRead) ?? max;

  // if no max, skip all checks as they all require max to be provided
  const error =
    max == null
      ? null
      : min != null && min > max
        ? `min and max range: ${min}-${max}`
        : maxRead != null && max < maxRead
          ? `max and maxRead range: ${max} >= ${maxRead}`
          : null;

  if (error) {
    const data = ndata(opts, src, cfg.type, []);
    const name = display(data);
    throw new ParseError(
      ParseError.OPTIONS_ERROR,
      (name ? name + 'has i' : 'I') + `nvalid ${error}`,
      data
    );
  }

  // save splittable aliases to names array
  let safeAlias = true;
  const names: string[] = [];
  const aliases: NormalizedOptions['aliases'] = obj();

  function setAlias(name: string, all: AliasArgs) {
    aliases[name] = all.map((args): Alias => ({ name, args }));
    // skip command aliases since we don't need to split them
    // and remove `-` prefix
    if (isAlias(name)) {
      names.push(name.slice(1));
      safeAlias &&= !name.includes('=');
    }
  }

  // apply aliases
  for (const [key, alias] of Object.entries(cfg.aliases)) {
    /** List of strings in `args`. */
    let strs: [string, ...string[]] | undefined;
    const all: [string, ...string[]][] = [];
    const args =
      typeof alias === 'string' ? [alias] : Array.isArray(alias) ? alias : [];

    for (const arg of args) {
      if (typeof arg === 'string') {
        strs ? strs.push(arg) : all.push((strs = [arg]));
      } else if (Array.isArray(arg) && arg.length > 0) {
        // filter out empty array
        all.push(arg as [string, ...string[]]);
      }
    }

    all.length > 0 && setAlias(key, all as AliasArgs);
  }

  // apply aliases from args
  const cfgs = Object.entries(cfg.args);
  for (const [key, { type, options }] of cfgs) {
    // use `alias[0]` as alias and `arg` as arg
    const items =
      typeof options.alias === 'string'
        ? [options.alias]
        : Array.isArray(options.alias)
          ? options.alias
          : [];
    for (const item of items) {
      // each item is an alias
      // if item is an array, item[0] is an alias
      const arr =
        typeof item === 'string' ? [item] : Array.isArray(item) ? item : [];
      if (arr.length === 0) continue;

      const a = arr[0];
      if (aliases[a]) {
        // this node data is for current value options
        // and is not being parsed but being validated
        type N = NodeData;
        const data: N = { raw: key, key, alias: null, type, args: [], options };

        // assume that the display name always has value
        // since data.key is explicitly provided
        throw new ParseError(
          ParseError.OPTIONS_ERROR,
          `${display(data)}cannot use an existing alias: ${a}`,
          data
        );
      }

      setAlias(a, [[key].concat(arr.slice(1))] as [[string, ...string[]]]);
    }
  }

  const fertile =
    !!src.handler || cfgs.length > 0 || Object.keys(aliases).length > 0;

  return {
    type: cfg.type,
    leaf: !fertile && (src.leaf ?? cfg.type === 'option'),
    fertile,
    safeAlias,
    range: { min, max, maxRead },
    src,
    args: obj(cfg.args),
    aliases,
    // sort by length desc for splitting later on
    names: names.sort((a, b) => b.length - a.length)
  };
}
