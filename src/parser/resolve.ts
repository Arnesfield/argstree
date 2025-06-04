import { isOption } from '../lib/is-option';
import { split, Split, SplitItem } from '../lib/split';
import { Arg } from '../types/arg.types';
import { NonEmptyArray } from '../types/util.types';
import { array } from '../utils/array';
import { NodeOptions } from './cnode';
import { Alias, NormalizedOptions } from './normalize';

// NOTE: internal

// make props optional except 'key'
export interface ParsedArg
  extends Pick<Alias, 'key'>,
    Partial<Omit<Alias, 'key'>> {}

// same as NodeOptions but some props are required
export type ResolveItem<T> = Omit<NodeOptions<T>, 'key' | 'args'> &
  Required<Pick<NodeOptions<T>, 'key' | 'args'>>;

// like Arg but has conditional props `split` and `items`
export type ResolveArg<T> = Arg &
  (
    | { split: Split; items?: never }
    | { split?: never; items?: NonEmptyArray<ResolveItem<T>> }
  );

function get<T>(
  opts: NormalizedOptions<T>,
  arg: ParsedArg,
  value?: string
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
  raw: string, // raw key
  val?: string | null // raw value
): ResolveArg<T> | undefined {
  // immediately treat as value if the current node cannot actually create children
  if (opts.skip) return;

  // start of using raw as arg.key
  // also assume arg.raw and raw are the same

  // no `split` and `items` yet
  const arg = { raw, key: raw } as ResolveArg<T>;
  if (val != null) arg.value = val;
  const { value } = arg;

  // parse options from options.map using raw as key
  let item = get(opts, arg, value);
  if (item && (arg.items = [item])) return arg;

  let index: number, // index of `=` in raw
    diff: boolean | undefined, // arg.raw !== arg.key
    alias: Alias | undefined,
    s: Split | undefined,
    last: SplitItem;

  // set arg.key and arg.value if `val` param is not provided
  if (val === undefined && (diff = (index = raw.indexOf('=')) > -1)) {
    arg.key = raw.slice(0, index);

    // at this point, arg.key is now different from raw (diff)
    // try to parse using new values if arg.key is different
    item = get(opts, arg, (arg.value = raw.slice(index + 1)));
  }

  if (item) {
    // items found, do nothing and return value
  }

  // at this point, if there are no parsed options, arg can be:
  // - an exact alias
  // - a merged alias
  // - options from parser
  // - a value (or, if in strict mode, an unknown option-like)
  // for this case, handle exact alias
  // check raw first, then arg.key if they're different
  else if ((alias = opts.alias[raw]) && (item = get(opts, alias, value))) {
    // alias items found, do nothing and return value
  } else if (
    diff &&
    (alias = opts.alias[arg.key]) &&
    (item = get(opts, alias, arg.value))
  ) {
    // alias items found, do nothing and return value
  }

  type I = NonEmptyArray<ResolveItem<T>>;

  if (item) arg.items = [item];
  // now, arg cannot be an exact alias.
  // split arg.key by aliases
  // if no remainder, resolve split aliases with arg.value
  // otherwise, parse by parser option
  // if has value, use parsed options
  // otherwise, arg must either be a value or an incorrect merged alias
  // if there are split remainders, throw error
  // otherwise, treat as value
  // if value is an option-like with strict mode, throw error
  // otherwise, save value to node.args
  // split cases:
  // - raw no equal sign, same key (-abc, -abc, null)
  // - raw equal sign, different key (-abc=1, -abc, 1)
  else if (
    !(
      opts.keys.length > 0 &&
      isOption(arg.key, 'short') &&
      (s = split(arg.key.slice(1), opts.keys)).values.length > 0
    )
  ) {
    // if no split values, do nothing
  }

  // NOTE: parse by parser option outside of resolver

  // assume `-{value}` always exists as long as split item is not a remainder
  // get last split item regardless if there are remainders or not
  // and if it's not a remainder but the options cannot be parsed,
  // assume it's not assignable and we should not return the split result
  else if (
    !(last = s.items[s.items.length - 1]).remainder &&
    !(item = get(opts, opts.alias['-' + last.value], arg.value))
  ) {
    // ignore split
  }

  // return split result only if there are remainders
  // and if the last parsed item exists,
  // ensuring that the last parsed item is assignable if a value exists
  else if (s.remainders.length > 0) arg.split = s;
  // if no remainders, get args per alias
  // reuse last parsed item
  // - assume `item` exists at this point since the last split item is not a remainder
  // - assume that aliases will always map to options
  // since it does not have to be assignable (only for the last alias arg)
  // also, no more parser fallback for aliases!
  // prettier-ignore
  else arg.items = s.values.map((v, i, a) => i === a.length - 1 ? item! : get(opts, opts.alias['-' + v])!) as I;

  // either treat as raw value or use parsed items
  return arg;
}
