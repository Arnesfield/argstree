import { ParseError } from '../lib/error';
import { ArgConfig, Config } from '../schema/schema.types';
import { Node } from '../types/node.types';
import { Options } from '../types/options.types';
import { NonEmptyArray } from '../types/util.types';
import { isAlias } from '../utils/arg';
import { display } from '../utils/display';
import { obj } from '../utils/obj';
import { cnode } from './cnode';

// NOTE: internal

export type AliasArgs = NonEmptyArray<string>;
export type AliasArgsList = NonEmptyArray<AliasArgs>;

export interface Alias {
  /** Alias name. */
  key: string;
  /** The argument to match. */
  arg: string;
  /** Alias arguments. */
  args: string[];
}

export interface NormalizedOptions {
  /** The resolved {@linkcode Options.read} option. */
  readonly read: boolean;
  /** Determines if the node is a leaf node and cannot have descendants. */
  readonly leaf: boolean;
  /** Determines if the node can actually have children. */
  readonly fertile: boolean;
  /** Determines if the {@linkcode keys} have no equal signs (`=`). */
  readonly safeAlias: boolean;
  /** The resolved {@linkcode Options.min} option. */
  readonly min: number | null;
  /** The resolved {@linkcode Options.max} option. */
  readonly max: number | null;
  /** The reference to the provided options. */
  readonly src: Options;
  /** Safe args object. */
  readonly args: { [arg: string]: Config | ArgConfig | undefined };
  /** Safe aliases object. */
  readonly aliases: { [alias: string]: Alias };
  /** A sorted list of splittable alias keys without the `-` prefix. */
  readonly keys: string[];
}

export interface NormalizeOptions
  extends Partial<Pick<Node, 'raw' | 'key' | 'alias' | 'args'>> {
  cfg: Config;
}

// ensure non-negative number
function number(n: number | null | undefined): number | null {
  return typeof n === 'number' && isFinite(n) && n >= 0 ? n : null;
}

export function normalize(
  opts: NormalizeOptions,
  // NOTE: data is only used for error purposes
  data: Node
): NormalizedOptions {
  const c = opts.cfg;
  const src = c.options;

  // get and validate range
  const min = number(src.min);
  const max = number(src.max);

  if (min != null && max != null && min > max) {
    const name = display(data);
    const msg =
      (name ? name + 'has i' : 'I') + `nvalid min and max range: ${min}-${max}`;
    throw new ParseError(ParseError.OPTIONS_ERROR, msg, data, src);
  }

  // save splittable aliases to keys array
  let safeAlias = true;
  const keys: string[] = [];
  const aliases: NormalizedOptions['aliases'] = obj();

  // apply aliases from args
  const cfgs = Object.entries(c.args);
  for (const [raw, cfg] of cfgs) {
    // use `alias[0]` as alias and `arg` as arg
    const items =
      typeof cfg.options.alias === 'string'
        ? [cfg.options.alias]
        : Array.isArray(cfg.options.alias)
          ? cfg.options.alias
          : [];
    for (const item of items) {
      // each item is an alias
      // if item is an array, item[0] is an alias
      const arr =
        typeof item === 'string' ? [item] : Array.isArray(item) ? item : [];
      if (arr.length === 0) continue;

      const key = arr[0];
      if (aliases[key]) {
        // this node is for current value options
        // and is not being parsed but being validated
        data = cnode({ raw, key: raw, cfg }, data.parent, []);

        // assume that the display name always has value
        // since data.key is explicitly provided
        const msg = `${display(data)}cannot use an existing alias: ${key}`;
        throw new ParseError(ParseError.OPTIONS_ERROR, msg, data, cfg.options);
      }

      aliases[key] = { key, arg: raw, args: arr.slice(1) };

      // skip command aliases since we don't need to split them
      // and remove `-` prefix
      if (isAlias(key)) {
        keys.push(key.slice(1));
        safeAlias &&= !key.includes('=');
      }
    }
  }

  // check args length first since it is the most likely to always be true
  const fertile =
    cfgs.length > 0 || !!src.handler || Object.keys(aliases).length > 0;

  return {
    read: src.read ?? true,
    leaf: !fertile && (src.leaf ?? c.type === 'option'),
    fertile,
    safeAlias,
    min,
    max,
    src,
    args: obj(c.args),
    aliases,
    // sort by length desc for splitting later on
    keys: keys.sort((a, b) => b.length - a.length)
  };
}
