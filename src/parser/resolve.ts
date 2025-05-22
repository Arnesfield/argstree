import { isOption } from '../lib/is-option';
import { split as $split, Split } from '../lib/split';
import { Schema } from '../schema/schema.types';
import { Arg } from '../types/arg.types';
import { NonEmptyArray } from '../types/util.types';
import { NodeOptions } from './cnode';
import { Alias, NormalizedOptions } from './normalize';

// NOTE: internal

// make props optional except 'key'
export interface ParsedArg
  extends Pick<Alias, 'key'>,
    Partial<Omit<Alias, 'key'>> {}

export interface ResolvedSplit extends Split {
  list?: NonEmptyArray<Alias> | false;
}

// same as NodeOptions but some props are required
export type ResolvedItem<T> = Omit<NodeOptions<T>, 'key' | 'args'> &
  Required<Pick<NodeOptions<T>, 'key' | 'args'>>;

export interface ResolveResult<T> {
  arg: Arg;
  split?: ResolvedSplit;
  items?: NonEmptyArray<ResolvedItem<T>>;
}

export function resolveArgs<T>(s: Pick<Schema<T>, 'options'>): string[] {
  const a = s.options.args;
  return typeof a === 'string' ? [a] : Array.isArray(a) ? a.slice() : [];
}

function get<T>(
  opts: NormalizedOptions<T>,
  arg: ParsedArg,
  value?: string
): ResolvedItem<T> | undefined {
  const schema = opts.map[arg.key];
  const hasValue = value != null;
  if (
    schema &&
    (!hasValue || (schema.options.assign ?? schema.type === 'option'))
  ) {
    // save alias args and value if any
    const args = resolveArgs(schema);
    arg.args && args.push(...arg.args);
    hasValue && args.push(value);
    return { key: arg.key, alias: arg.alias, value, args, schema };
  }
}

function getAlias<T>(
  opts: NormalizedOptions<T>,
  aliases: NonEmptyArray<Alias>,
  value?: string
) {
  // assignable arg --option: initial 1, 2
  // alias -a: --option 3, 4
  // scenario: -a=5

  // convert aliases to options
  // make sure the last option is assignable if value exists

  const item = get(opts, aliases[aliases.length - 1], value);
  if (item) {
    // reuse last parsed item
    // assume that aliases will always map to options since
    // it does not have to be assignable (only for the last alias arg)
    // also, no more handler fallback for aliases!

    type I = NonEmptyArray<ResolvedItem<T>>;
    // prettier-ignore
    return aliases.map((alias, i) => i === aliases.length - 1 ? item : get(opts, alias)!) as I;
  }
}

function splitArg<T>(opts: NormalizedOptions<T>, arg: string) {
  // only accept aliases and remove first `-` for alias
  // considered as split only if alias args were found.
  // note that split.values would always exist as keys in opts.alias
  // as we use opts.keys for splitting which is derived from opts.alias
  let s: ResolvedSplit | undefined;
  if (
    isOption(arg, 'short') &&
    (s = $split(arg.slice(1), opts.keys)).values.length > 0
  ) {
    // only set list if has no remainder
    // get args per alias and assume `-{name}` always exists
    type A = NonEmptyArray<Alias>;
    s.list =
      s.remainder.length === 0 &&
      (s.values.map(key => opts.alias['-' + key]) as A);
    return s;
  }
}

export function resolve<T>(
  raw: string,
  opts: NormalizedOptions<T>
): ResolveResult<T> | undefined {
  // immediately treat as value if the current node cannot actually create children
  if (opts.skip) return;

  let items, alias, split;
  const arg: Arg = { raw, key: raw };

  if ((items = get(opts, arg))) {
    return { arg, items: [items] };
  }

  // assume arg.raw and raw are the same
  const index = raw.lastIndexOf('=');
  const hasValue = index > -1;
  if (hasValue) {
    arg.key = raw.slice(0, index);
    arg.value = raw.slice(index + 1);
  }

  // parse options from options.args only
  if (hasValue && (items = get(opts, arg, arg.value))) {
    items = [items] as NonEmptyArray<ResolvedItem<T>>;
  }

  // at this point, if there are no parsed options, arg can be:
  // - an exact alias
  // - a merged alias
  // - options from handler
  // - a value (or, if in strict mode, an unknown option-like)
  // for this case, handle exact alias
  else if ((alias = opts.alias[raw]) && (items = getAlias(opts, [alias]))) {
    // alias items found, do nothing and return value
  } else if (
    hasValue &&
    (alias = opts.alias[arg.key]) &&
    (items = getAlias(opts, [alias], arg.value))
  ) {
    // alias items found, do nothing and return value
  }

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

  // if safe alias (no alias equal signs),
  // then there is no reason to split raw as raw could contain an equal sign
  // if unsafe, split raw
  // if unsafe, split arg.key only if it does not match raw (hasValue)
  else if (
    !opts.safeAlias &&
    (split = splitArg(opts, raw))?.list &&
    (items = getAlias(opts, split.list))
  ) {
    // you would think it might be ideal to stop parent.split()
    // when it finds at least 1 remainder, but we'll need to display
    // the list of remainders for the error message anyway,
    // so this is probably ok.
    // also set alias was successful, do nothing and return value
  } else if (
    (opts.safeAlias || hasValue) &&
    (split = splitArg(opts, arg.key))?.list &&
    (items = getAlias(opts, split.list, arg.value))
  ) {
    // alias items found, do nothing and return value
  }

  // NOTE: parse by handler outside of resolver

  // split can be unset by the 2nd parent.split() call
  // which is ok since it would be weird to show remainders from raw
  else if (split && split.remainder.length > 0) {
    return { arg, split };
  }

  // either treat as raw value or use parsed configs
  return { arg, items };
}
