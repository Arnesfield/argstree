import { Aliases, NodeData, Options } from '../core/core.types.js';
import { ParseError } from '../core/error.js';
import { AliasArgs, ArgConfig, Config } from '../schema/schema.types.js';
import { isAlias } from '../utils/arg.utils.js';
import { display } from '../utils/display.utils.js';
import { ensureNumber } from '../utils/ensure-number.js';
import { obj } from '../utils/object.utils.js';

// NOTE: internal

export interface Alias {
  /** Alias name. */
  name: string;
  args: [string, ...string[]];
}

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
    error?: string | null;
  };
  readonly src: Options;
  /** Safe args object. */
  readonly args: { [arg: string]: Config | ArgConfig | undefined };
  /** Safe aliases object. */
  readonly aliases: { [alias: string]: Alias[] };
  /** A sorted list of splittable alias names without the `-` prefix. */
  readonly names: string[];
}

function getArgs(alias: Aliases[string]): [string, ...string[]][] {
  /** List of strings in `args`. */
  let strs: [string, ...string[]] | undefined;
  const list: [string, ...string[]][] = [];
  const args =
    typeof alias === 'string' ? [alias] : Array.isArray(alias) ? alias : [];

  for (const arg of args) {
    if (typeof arg === 'string') {
      strs ? strs.push(arg) : list.push((strs = [arg]));
    } else if (Array.isArray(arg) && arg.length > 0) {
      // filter out empty array
      list.push(arg as [string, ...string[]]);
    }
  }

  return list;
}

export function normalize(config: Config): NormalizedOptions {
  const src = config.options;

  // get and validate range
  type R = NormalizedOptions['range'];
  const range: R = { min: ensureNumber(src.min), max: ensureNumber(src.max) };
  range.maxRead = ensureNumber(src.maxRead) ?? range.max;

  // this might look out of place,
  // but this ensures that the range check is done only once.
  // if no max, skip all checks as they all require max to be provided
  const { min, max, maxRead } = range;
  range.error =
    max == null
      ? null
      : min != null && min > max
        ? `min and max range: ${min}-${max}`
        : maxRead != null && max < maxRead
          ? `max and maxRead range: ${max} >= ${maxRead}`
          : null;

  // save splittable aliases to names array
  const names: string[] = [];
  const aliases: NormalizedOptions['aliases'] = obj();

  function setAlias(name: string, val: AliasArgs) {
    aliases[name] = val.map((args): Alias => ({ name, args }));
    // skip command aliases since we don't need to split them
    // and remove `-` prefix
    isAlias(name) && names.push(name.slice(1));
  }

  // apply aliases
  for (const [key, alias] of Object.entries(config.aliases)) {
    const args = getArgs(alias);
    args.length > 0 && setAlias(key, args as AliasArgs);
  }

  // apply aliases from args
  const cfgs = Object.entries(config.args);
  for (const [key, cfg] of cfgs) {
    const { type, options } = cfg;

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
    type: config.type,
    leaf: !fertile && (src.leaf ?? config.type === 'option'),
    fertile,
    range,
    src,
    args: obj(config.args),
    aliases,
    // sort by length desc for splitting later on
    names: names.sort((a, b) => b.length - a.length)
  };
}
