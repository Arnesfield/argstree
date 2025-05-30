import { isOption } from '../lib/is-option';
import { split as $split, Split } from '../lib/split';
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

interface ResolveSplit<T> extends Split {
  /**
   * List of resolved items.
   * This property is only set if there are no {@linkcode Split.remainders}
   * and that the last option or command is assignable when a value assigned.
   */
  list?: NonEmptyArray<ResolveItem<T>>;
}

export interface ResolveResult<T> {
  arg: Arg;
  split?: Split;
  items?: NonEmptyArray<ResolveItem<T>>;
}

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

function splitArg<T>(opts: NormalizedOptions<T>, arg: string, value?: string) {
  // only accept aliases and remove first `-` for alias
  // considered as split only if alias args were found.
  // note that split.values would always exist as keys in opts.alias
  // as we use opts.keys for splitting which is derived from opts.alias
  let s: ResolveSplit<T> | undefined;
  if (
    !isOption(arg, 'short') ||
    (s = $split(arg.slice(1), opts.keys)).values.length === 0
  ) return; // prettier-ignore

  // only set list if has no remainder
  if (s.remainders.length === 0) {
    // get args per alias and assume `-{name}` always exists
    // prettier-ignore
    const item = get(opts, opts.alias['-' + s.values[s.values.length - 1]], value);

    // reuse last parsed item
    // assume that aliases will always map to options since
    // it does not have to be assignable (only for the last alias arg)
    // also, no more handler fallback for aliases!

    type I = NonEmptyArray<ResolveItem<T>>;
    // prettier-ignore
    s.list = item && s.values.map((v, i, a) => i === a.length - 1 ? item : get(opts, opts.alias['-' + v])!) as I;
  }
  return s;
}

export function resolve<T>(
  raw: string,
  opts: NormalizedOptions<T>
): ResolveResult<T> | undefined {
  // immediately treat as value if the current node cannot actually create children
  if (opts.skip) return;

  let items: ResolveItem<T> | NonEmptyArray<ResolveItem<T>> | undefined;
  const arg: Arg = { raw, key: raw };

  // parse options from options.map only
  if ((items = get(opts, arg))) return { arg, items: [items] };

  let index: number,
    hasValue: boolean,
    alias: Alias | undefined,
    split: Split | undefined;

  // assume arg.raw and raw are the same
  // also take this opportunity to set arg.key and arg.value
  if (
    (hasValue = (index = raw.lastIndexOf('=')) > -1) &&
    ((arg.key = raw.slice(0, index)),
    (items = get(opts, arg, (arg.value = raw.slice(index + 1)))))
  ) {
    // items found, do nothing and return value
  }

  // at this point, if there are no parsed options, arg can be:
  // - an exact alias
  // - a merged alias
  // - options from handler
  // - a value (or, if in strict mode, an unknown option-like)
  // for this case, handle exact alias
  else if ((alias = opts.alias[raw]) && (items = get(opts, alias))) {
    // alias items found, do nothing and return value
  } else if (
    hasValue &&
    (alias = opts.alias[arg.key]) &&
    (items = get(opts, alias, arg.value))
  ) {
    // alias items found, do nothing and return value
  }

  if (items) return { arg, items: [items] };

  // now, arg cannot be an exact alias.
  // try to split raw by aliases
  // if no remainder, resolve split aliases with no value
  // otherwise, split arg.name by aliases if not the same as raw
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
  // - raw equal sign, different key no equal sign (-abc=1, -abc, 1)
  // - raw equal sign, different key equal sign (-abc=a=1, -abc=a, 1)

  // if safe alias keys (no alias equal signs),
  // then there is no reason to split raw as raw could contain an equal sign
  // if unsafe, split raw
  // if unsafe, split arg.key only if it does not match raw (hasValue)
  if (!opts.safeKeys && (items = (split = splitArg(opts, raw))?.list)) {
    // keep split result for error message
    // split items found, do nothing and return value
  } else if (
    (opts.safeKeys || hasValue) &&
    (items = (split = splitArg(opts, arg.key, arg.value))?.list)
  ) {
    // split items found, do nothing and return value
  }

  // NOTE: parse by handler outside of resolver

  // only return split result if has remainders
  // split can be unset by the 2nd parent.split() call
  // which is ok since it would be weird to show remainders from raw
  else if (split && split.remainders.length > 0) return { arg, split };

  // either treat as raw value or use parsed items
  return { arg, items };
}
