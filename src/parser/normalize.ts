import { ParseError } from '../lib/error';
import { isOption } from '../lib/is-option';
import { Arg } from '../types/arg.types';
import { Options } from '../types/options.types';
import { Schema, SchemaMap } from '../types/schema.types';
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
  /** Safe schema map object. */
  readonly map: Partial<SchemaMap<T>>;
  /** Safe alias map object. */
  readonly alias: { [alias: string]: Alias };
  /** A sorted list of splittable alias keys without the `-` prefix. */
  readonly keys: string[];
}

export function normalize<T>(
  schema: Schema<T>,
  // NOTE: node is only used for error purposes
  node = cnode<T>({ schema })
): NormalizedOptions<T> {
  // initialize schema args before anything else
  const map: SchemaMap<T> = { __proto__: null!, ...schema.schemas() };
  const o = schema.options;

  // get and validate range
  const [min, max] = range(o.min, o.max, node, schema);

  // save splittable aliases to keys array
  const keys: string[] = [];
  const alias: NormalizedOptions<T>['alias'] = { __proto__: null! };

  // apply aliases from args
  const items = Object.entries(map);
  for (const [key, s] of items) {
    for (const item of array(s.options.alias, true)) {
      // each item is an alias
      // if item is an array, item[0] is an alias
      const arr = array(item, true);
      if (arr.length === 0) continue;

      // use `alias[0]` as alias id and `arg` as arg
      const a = arr[0];
      if (alias[a]) {
        // this node is for current value options
        // and is not being parsed but being validated
        node = cnode({ key, schema: s }, key, node);
        const name = display(node);
        const msg =
          (name ? name + 'c' : 'C') + `annot use an existing alias: ${a}`;
        throw new ParseError(ParseError.OPTIONS_ERROR, msg, node, s);
      }

      alias[a] = { key, alias: a, args: arr.slice(1) };

      // accept short options only for splitting and remove `-` prefix
      isOption(a, 'short') && keys.push(a.slice(1));
    }
  }

  // check args length first since it is the most likely to always be true
  const fertile = items.length > 0 || !!o.parser;
  const { leaf = !fertile && schema.type === 'option' } = o;

  // sort by length desc for splitting later on
  keys.sort((a, b) => b.length - a.length);

  return { min, max, leaf, fertile, skip: !fertile || leaf, map, alias, keys };
}
