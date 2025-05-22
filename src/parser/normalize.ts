import { ParseError } from '../lib/error';
import { isOption } from '../lib/is-option';
import { Schema, SchemaMap } from '../schema/schema.types';
import { Arg } from '../types/arg.types';
import { Node } from '../types/node.types';
import { Options } from '../types/options.types';
import { array } from '../utils/array';
import { display } from '../utils/display';
import { range } from '../utils/range';
import { cnode } from './cnode';

// NOTE: internal

export interface Alias extends Pick<Arg, 'key'> {
  /** Alias name. */
  alias: string;
  /** Alias arguments. */
  args: string[];
}

export interface NormalizedOptions<T> {
  /** The resolved {@linkcode Options.min} option. */
  readonly min: number | null;
  /** The resolved {@linkcode Options.max} option. */
  readonly max: number | null;
  /** Determines if the node is a leaf node and cannot have descendants. */
  readonly leaf: boolean;
  /** Determines if the node can actually have children. */
  readonly fertile: boolean;
  /** Determines if the node should skip parsing and treat arguments as values instead. */
  readonly skip: boolean;
  /** Determines if the {@linkcode keys} have no equal signs (`=`). */
  readonly safeAlias: boolean;
  /** Safe schema map object. */
  readonly map: Partial<SchemaMap<T>>;
  /** Safe alias map object. */
  readonly alias: { [alias: string]: Alias };
  /** A sorted list of splittable alias keys without the `-` prefix. */
  readonly keys: string[];
}

export function normalize<T>(
  s: Schema<T>,
  // NOTE: data is only used for error purposes
  node?: Node<T>
): NormalizedOptions<T> {
  // initialize schema args before anything else
  const map: SchemaMap<T> = { __proto__: null!, ...s.schemas() };
  const o = s.options;

  // get and validate range
  const [min, max] = range(o.min, o.max, s, node);

  // save splittable aliases to keys array
  let safeAlias = true;
  const keys: string[] = [];
  const alias: NormalizedOptions<T>['alias'] = { __proto__: null! };

  // apply aliases from args
  const items = Object.entries(map);
  for (const [key, c] of items) {
    for (const item of array(c.options.alias, true)) {
      // each item is an alias
      // if item is an array, item[0] is an alias
      const arr = array(item, true);
      if (arr.length === 0) continue;

      // use `alias[0]` as alias id and `arg` as arg
      const a = arr[0];
      if (alias[a]) {
        // this node is for current value options
        // and is not being parsed but being validated
        node &&= cnode(key, { key, schema: c }, node);
        const name = display(node || { name: key, type: c.type });
        const msg =
          (name ? name + 'c' : 'C') + `annot use an existing alias: ${a}`;
        throw new ParseError(ParseError.OPTIONS_ERROR, msg, c, node);
      }

      alias[a] = { key, alias: a, args: arr.slice(1) };

      // skip command aliases since we don't need to split them
      // and remove `-` prefix
      if (isOption(a, 'short')) {
        keys.push(a.slice(1));
        safeAlias &&= !a.includes('=');
      }
    }
  }

  // check args length first since it is the most likely to always be true
  const fertile = items.length > 0 || !!o.handler;
  const { leaf = !fertile && s.type === 'option' } = o;

  // sort by length desc for splitting later on
  keys.sort((a, b) => b.length - a.length);

  // prettier-ignore
  return { min, max, leaf, fertile, skip: !fertile || leaf, safeAlias, map, alias, keys };
}
