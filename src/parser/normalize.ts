import { ParseError } from '../lib/error';
import { isOption } from '../lib/is-option';
import { ArgConfig, Config } from '../schema/schema.types';
import { Node } from '../types/node.types';
import { Options } from '../types/options.types';
import { display } from '../utils/display';
import { obj } from '../utils/obj';
import { cnode } from './cnode';

// NOTE: internal

// NOTE: match interface with ParsedArg
export interface Alias {
  /** The argument to match. */
  key: string;
  /** Alias name. */
  alias: string;
  /** Alias arguments. */
  args: string[];
}

export interface NormalizedOptions<T> {
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
  readonly src: Options<T>;
  /** Safe args object. */
  readonly args: { [arg: string]: Config<T> | ArgConfig<T> | undefined };
  /** Safe aliases object. */
  readonly aliases: { [alias: string]: Alias };
  /** A sorted list of splittable alias keys without the `-` prefix. */
  readonly keys: string[];
}

// ensure non-negative number
function number(n: number | null | undefined): number | null {
  return typeof n === 'number' && isFinite(n) && n >= 0 ? n : null;
}

// ensure array string
function array<T>(a: T | T[] | null | undefined): T[] {
  return typeof a === 'string' ? [a] : Array.isArray(a) ? a : [];
}

export function normalize<T>(
  c: ArgConfig<T>,
  // NOTE: data is only used for error purposes
  data?: Node<T>
): NormalizedOptions<T> {
  const src = c.options;

  // get and validate range
  const min = number(src.min);
  const max = number(src.max);

  if (min != null && max != null && min > max) {
    const name = data && display(data);
    const msg =
      (name ? name + 'has i' : 'I') + `nvalid min and max range: ${min}-${max}`;
    throw new ParseError(ParseError.OPTIONS_ERROR, msg, data, src);
  }

  // save splittable aliases to keys array
  let safeAlias = true;
  const keys: string[] = [];
  const args = obj(c.args);
  const aliases: NormalizedOptions<T>['aliases'] = obj();

  // apply aliases from args
  const cfgs = Object.entries(args);
  for (const [key, cfg] of cfgs) {
    for (const item of array(cfg.options.alias)) {
      // each item is an alias
      // if item is an array, item[0] is an alias
      const arr = array(item);
      if (arr.length === 0) continue;

      // use `alias[0]` as alias id and `arg` as arg
      const a = arr[0];
      if (aliases[a]) {
        // this node is for current value options
        // and is not being parsed but being validated
        data &&= cnode(key, { key, cfg }, data);
        const name = display(data || { name: key, type: cfg.type });
        const msg =
          (name ? name + 'c' : 'C') + `annot use an existing alias: ${a}`;
        throw new ParseError(ParseError.OPTIONS_ERROR, msg, data, cfg.options);
      }

      aliases[a] = { key, alias: a, args: arr.slice(1) };

      // skip command aliases since we don't need to split them
      // and remove `-` prefix
      if (isOption(a, 'short')) {
        keys.push(a.slice(1));
        safeAlias &&= !a.includes('=');
      }
    }
  }

  // check args length first since it is the most likely to always be true
  const fertile = cfgs.length > 0 || !!src.handler;
  const { read = true, leaf = !fertile && c.type === 'option' } = src;

  // sort by length desc for splitting later on
  keys.sort((a, b) => b.length - a.length);

  return { read, leaf, fertile, safeAlias, min, max, src, args, aliases, keys };
}
