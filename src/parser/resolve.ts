import { isOption } from '../lib/is-option';
import { split, Split } from '../lib/split';
import { Arg } from '../types/arg.types';
import { NonEmptyArray } from '../types/util.types';
import { array } from '../utils/array';
import { NodeOptions } from './cnode';
import { Alias, NormalizedOptions } from './normalize';

// NOTE: internal

// make props optional except 'key'
export interface ParsedArg
  extends Pick<Alias, 'key'>,
    Partial<Omit<Alias, 'key'>>,
    Pick<Arg, 'value'> {}

// same as NodeOptions but some props are required
export type ResolveItem<T> = Omit<NodeOptions<T>, 'key' | 'args'> &
  Required<Pick<NodeOptions<T>, 'key' | 'args'>>;

// always required `arg` if `items` is not provided
export type ResolveResult<T> =
  | { arg?: never; split?: never; items: NonEmptyArray<ResolveItem<T>> }
  | { arg: Arg; split: Split; items?: never }
  | {
      arg: Arg;
      split?: never;
      items: NonEmptyArray<ResolveItem<T>> | undefined;
    };

function get<T>(
  opts: NormalizedOptions<T>,
  arg: ParsedArg,
  value = arg.value
): ResolveItem<T> | undefined {
  const schema = opts.map[arg.key];
  const hasValue = value != null;
  if (
    schema &&
    (!hasValue || (schema.options.assign ?? schema.type === 'option'))
  ) {
    // save alias args and value if any
    const args = array(schema.options.args);
    arg.args && args.push(...arg.args);
    hasValue && args.push(value);
    return { key: arg.key, alias: arg.alias, value, args, schema };
  }
}

export function resolve<T>(
  opts: NormalizedOptions<T>,
  raw: string,
  value?: string | null
): ResolveResult<T> | undefined {
  // immediately treat as value if the current node cannot actually create children
  if (opts.skip) return;

  let items: ResolveItem<T> | NonEmptyArray<ResolveItem<T>> | undefined;
  const arg: Arg = { raw, key: raw, value: value ?? undefined };

  // parse options from options.map only
  if ((items = get(opts, arg))) return { items: [items] };

  let index: number,
    diff: boolean | undefined, // arg.raw !== arg.key
    alias: Alias | undefined,
    s: Split | undefined;

  // parse arg.key and arg.value if value prop is not set
  if (value === undefined && (diff = (index = raw.indexOf('=')) > -1)) {
    arg.key = raw.slice(0, index);
    arg.value = raw.slice(index + 1);
  }

  // since arg.key is changed, diff is true
  // also assume arg.raw and raw are the same
  if (diff && (items = get(opts, arg))) {
    // items found, do nothing and return value
  }

  // at this point, if there are no parsed options, arg can be:
  // - an exact alias
  // - a merged alias
  // - options from handler
  // - a value (or, if in strict mode, an unknown option-like)
  // for this case, handle exact alias
  // check raw first, then arg.key if they're different
  else if ((alias = opts.alias[raw]) && (items = get(opts, alias, arg.value))) {
    // alias items found, do nothing and return value
  } else if (
    diff &&
    (alias = opts.alias[arg.key]) &&
    (items = get(opts, alias, arg.value))
  ) {
    // alias items found, do nothing and return value
  }

  if (items) return { items: [items] };

  // now, arg cannot be an exact alias.
  // split arg.key by aliases
  // if no remainder, resolve split aliases with arg.value
  // otherwise, parse by handler
  // if has value, use parsed options
  // otherwise, arg must either be a value or an incorrect merged alias
  // if there are split remainders, throw error
  // otherwise, treat as value
  // if value is an option-like with strict mode, throw error
  // otherwise, save value to node.args

  // split cases:
  // - raw no equal sign, same key (-abc, -abc, null)
  // - raw equal sign, different key (-abc=1, -abc, 1)

  if (
    opts.keys.length > 0 &&
    isOption(arg.key, 'short') &&
    (s = split(arg.key.slice(1), opts.keys)).values.length > 0
  ) {
    // return split result if has remainders
    if (s.remainders.length > 0) return { arg, split: s };

    // NOTE: parse by handler outside of resolver

    // get args per alias and assume `-{key}` always exists
    // prettier-ignore
    const item = get(opts, opts.alias['-' + s.values[s.values.length - 1]], arg.value);

    // reuse last parsed item
    // assume that aliases will always map to options since
    // it does not have to be assignable (only for the last alias arg)
    // also, no more handler fallback for aliases!

    type I = NonEmptyArray<ResolveItem<T>>;
    // prettier-ignore
    items = item && s.values.map((v, i, a) => i === a.length - 1 ? item : get(opts, opts.alias['-' + v])!) as I;
  }

  // either treat as raw value or use parsed items
  return { arg, items };
}
